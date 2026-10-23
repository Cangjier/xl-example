# DTS 性能画像（DTS-PERF）

> 目标：把「真实 `.d.ts` 解析 ~2.0s（8 份）/ 3.4s（226 份）」拆到可归因的机制级证据，给下一轮优化定靶。
> 本轮**只做研究**：`.xl.md` 与 `core` / `typescript` 源码一行未改；新增 `tests/bench/dts-profile.mjs` 与本文件。
> 主仓基线：`xl-example@ffc0515a`（feature/quick-parse），克隆分支 `dts-profile`。

## 0. 结论摘要（TL;DR）

1. **总体耗时与输入字节严格线性**：226 份合计 3356ms，回归斜率 **0.487 ms/KB**，log-log 指数 **β=1.008**；把 `lib.dom.d.ts` 拼成 1/2/4/8 倍，ms/KB 分别为 0.4871 / 0.4869 / 0.4859 / 0.4867（β=0.999）。**没有超线性项**——不存在“某个大文件突然变慢”的算法问题，只有“每字节固定税偏高”。
2. **每字节的固定税 = 每输入字符 3.07 次 `new Source` 分配 + 6.15 次逐字符读取 + 1.005 个队列项 + 3.44 次 `UnitToken.Process`**（lib.dom，2,349,323 chars 实测计数）。等价于 **446–493 ns / char**。
3. **CPU 时间 70% 在 `core`**：`core/syntax` 43.2% + `core/basic-tokens` 26.8%；`typescript/tokens` 18.7%；GC 4.3%。上一轮「core 流水线 ≈28%」是**低估**——那是只数了三个最显眼的函数族；按目录自底向上聚合，core 是 70%。
4. **两个最大的可消除项**（都是架构级、必须改 core）：
   - `Source` 是**每个字符一个对象**（3.07 个/char），随之 35 次 Scavenge/次解析、~230 MB 垃圾/次解析；
   - `UnitToken.Process` 的 **20.04% self**（try/catch 包住整条 token 推进 + 三个 megamorphic 字段读 + `for…of` 迭代器），叠加 basic-token 链每字符把同一个字符依次“问”过 9 个 token 类的 `Transit`（合计 19.87%）。
5. **TS 参照**：同样 226 份，`ts.createSourceFile` 合计 **394ms**（带父指针）/ 284ms（不带），我们是 **x8.97 / x12.43**。按字节归一化后差距稳定，说明差距来自“每字符成本”而不是“某类语法”。
6. **可达目标区间**：不动 core、只做 typescript 层的局部修补（成员边界缓存、行首偏移惰性化、候选集）≈ **−5%（~3200ms）**；要进入 **1200–1600ms（−52%~−64%）必须改 core**（Source 值化、队列去 splice、Process 瘦身、字符级预分派）。**核心层改动本轮只研究不落地，需用户批准。**

---

## 1. 环境与口径

| 项 | 值 |
| --- | --- |
| Node | v24.21.0（V8 13.6.233.17-node.53） |
| 平台 | win32-x64 |
| CPU | Intel Xeon Platinum 8378C @ 2.80GHz，16 逻辑核 |
| 被测入口 | `SourceFileRunner.Parse(text, fileName)`（`build/ts/typescript/run/source-file-runner.js`） |
| 语料 | `node_modules` 下全部 `*.d.ts`：`typescript/lib` 110 + `@types/node` 72 + `undici-types` 44 = **226 份，7,094,521 B**（与 `typescript/cases/real-dts-ast.mjs` 同一批） |
| 计时 | `process.hrtime.bigint()` 只包住 `Parse`，不含 `readFileSync` |
| 稳定化 | corpus：warmup 1 + repeat 2，报 min/median/max/mean/stdev；单文件：warmup 1 + repeat 3~7 |
| 进程隔离 | 每个模式一个独立进程（`--corpus` / `--file` / `--ts` / `--scale` 不共享 JIT 状态）；未做跨机跨进程多次取中位（同一进程内的样本已足够稳定：lib.dom spread=x1.06） |
| 确定性 | 无随机数、不写跟踪文件；`--json` 只写 stdout |
| 运行间波动 | 同一进程内样本稳定（lib.dom spread x1.06），**跨运行**约 ±2%（全语料 3356–3430 ms，lib.dom 1086–1130 ms）；文中数字取自文首那一次完整运行 |

**口径差异（重要）**：`Parse` 只产出 **shape 树**（`SourceFileShape`），**本轮实测确认它不投影 AST**（`Parse` 返回 `root`，AST 由消费方按需从 shape 生成）。所以：

- `ours` = 一次扫描建 **一棵 shape 树**；
- `ts` = 一次扫描建 **一棵 AST**（`setParentNodes=true` 时会额外一遍设父指针，`ts-noParents` 关掉它）；
- 两边都是“一遍扫描建一棵树”，节点字段/后处理不同，**倍数只能当量级参照（上界）**，不是等价工作量；`ts-noParents` 更接近同等口径。

复现命令（全部在克隆根目录执行）：

```powershell
node tests/bench/dts-profile.mjs --corpus --json > tmp/corpus.json
node tests/bench/dts-profile.mjs --file node_modules/typescript/lib/lib.dom.d.ts --repeat 3
node tests/bench/dts-profile.mjs --ts --repeat 1
node tests/bench/dts-profile.mjs --scale 1,2,4,8
node --cpu-prof --cpu-prof-dir=tmp/prof --cpu-prof-interval=100 tests/bench/dts-profile.mjs --corpus --top 5
node --trace-gc tests/bench/dts-profile.mjs --file node_modules/typescript/lib/lib.dom.d.ts --repeat 2 --warmup 0
node tmp/stage-split.mjs node_modules/typescript/lib/lib.dom.d.ts
```

---

## 2. 端到端读数

### 2.1 全语料（226 份，repeat=2）

| 指标 | 值 |
| --- | --- |
| 合计（median 之和） | **3356.4 ms** |
| 每份 median | 中位 **1.41 ms** / 均值 **14.85 ms** / p90 **17.3 ms** / 最大 **1086.5 ms** / 最小 0.157 ms |
| 归一化 | **0.484 ms/KB**（合计口径） |
| OLS（ms vs KB） | 斜率 **0.487 ms/KB**，截距 −0.09 ms，**R²=0.987** |
| log-log 指数 | **β=1.008**（≈1 → 线性） |
| 墙钟 | 10575 ms（3 遍：warmup 1 + repeat 2，含 readFile） |
| 峰值 `used_heap_size` | 278 MB |
| GC 占比（CPU profile self） | **4.3%** |

耗时降序前 12 份（`stmts` = `SourceFileShape.Data.length`）：

| median ms | bytes | ms/KB | stmts | 文件 |
| ---: | ---: | ---: | ---: | --- |
| 1086.5 | 2,349,483 | 0.474 | 2805 | `typescript/lib/lib.dom.d.ts` |
| 395.8 | 787,076 | 0.515 | 1149 | `typescript/lib/lib.webworker.d.ts` |
| 393.0 | 588,452 | **0.684** | 2 | `typescript/lib/typescript.d.ts` |
| 142.1 | 228,347 | **0.637** | 3 | `@types/node/inspector.generated.d.ts` |
| 95.7 | 228,009 | 0.430 | 2 | `@types/node/crypto.d.ts` |
| 87.3 | 218,972 | 0.408 | 147 | `typescript/lib/lib.es5.d.ts` |
| 75.8 | 203,522 | 0.381 | 2 | `@types/node/fs.d.ts` |
| 66.8 | 135,826 | 0.504 | 2 | `@types/node/http2.d.ts` |
| 44.8 | 127,254 | 0.360 | 2 | `@types/node/test.d.ts` |
| 43.0 | 108,587 | 0.406 | 2 | `@types/node/process.d.ts` |
| 37.9 | 101,368 | 0.383 | 2 | `@types/node/http.d.ts` |
| 30.2 | 93,290 | 0.331 | 4 | `@types/node/util.d.ts` |

**读数说明**

- 8 份最大文件（`parse-perf.mjs --dts 8`）合计 **2067.4 ms**，与上一轮基线 1970–2110ms 一致。
- 前 5 份占全语料 **60%**（1086+396+393+142+96 = 2113 / 3356），**后 200 份合计不到 10%**。优化只要盯住 `lib.dom` / `lib.webworker` / `typescript.d.ts` / `inspector.generated` / `crypto` 这 5 份就覆盖 60%。
- **ms/KB 随内容浮动 ±70%**：`typescript.d.ts`（0.684）与 `inspector.generated.d.ts`（0.637）明显高于 `lib.dom`（0.474），而它们的 `stmts` 只有 2~3——即单个 `declare module`/`declare namespace` 巨型块、深嵌套成员、JSDoc 密度高的文件单价更高。结合 §2.4 的 scale 曲线（同内容拼接 ms/KB 恒定），说明**单价由“内容形态”决定，不由“体积”决定**；本轮不展开内容归因，但它是下一轮可查的方向（JSDoc/注释是 trivia，仍按字符走完整流水线）。

### 2.2 单文件重复（`--file`，lib.dom）

| 项 | 值 |
| --- | --- |
| samples（repeat=3） | 1228.1 / 1153.5 / 1158.6 ms |
| min / median / max | 1153.5 / **1158.6** / 1228.1 ms（spread x1.06） |
| 归一化 | 0.505 ms/KB → **493 ns/char** |
| 3 次最小（stage-split 干净口径） | **1048.7 ms** → 446 ns/char |
| GC（`--trace-gc`，2 次 parse） | 73 次：71 Scavenge + 2 Mark-Compact，暂停合计 **106.9 ms**（≈4.0%），峰值堆 193 MB |
| 堆 | 单次 parse `used_heap_size` +57 MB（14.4 → 71.5 MB） |

`--cpu-prof` / `--heap-prof` 会显著抬高读数（lib.dom 1697 ms，+46%），**所有计时结论都取自不带 profiler 的运行**。

### 2.3 与 `ts.createSourceFile` 对照（`--ts`，repeat=1）

| 文件 | ours ms | ts ms | ts(noParents) ms | ours/ts | ours/ts-noParents |
| --- | ---: | ---: | ---: | ---: | ---: |
| lib.dom.d.ts | 1130.0 | 127.0 | 82.9 | x8.90 | x13.63 |
| lib.webworker.d.ts | 449.8 | 35.3 | 26.9 | x12.75 | x16.75 |
| typescript.d.ts | 428.2 | 48.1 | 26.6 | x8.89 | x16.11 |
| @types/node/inspector.generated.d.ts | 170.3 | 14.4 | 12.0 | x11.81 | x14.22 |
| @types/node/crypto.d.ts | 108.0 | 11.0 | 8.6 | x9.80 | x12.57 |
| lib.es5.d.ts | 88.7 | 12.0 | 9.0 | x7.40 | x9.86 |
| @types/node/http2.d.ts | 87.9 | 10.4 | 6.3 | x8.46 | x13.91 |
| @types/node/fs.d.ts | 76.1 | 11.8 | 9.4 | x6.47 | x8.07 |
| @types/node/fs/promises.d.ts | 19.9 | 2.7 | 2.1 | x7.37 | x9.30 |
| @types/node/inspector.d.ts | 5.7 | 1.3 | 0.6 | x4.31 | x9.89 |
| **226 份合计** | **3535.4** | **394.3** | **284.5** | **x8.97** | **x12.43** |

- 倍数在不同文件上稳定在 **x6.5–x12.8（vs ts）/ x8–x16.8（vs noParents）**，与文件大小、语法形态无明显相关 → **差距是“每字符常数”，不是“某类结构”**。
- TS 的 394ms / 7.09MB ≈ **55 ns/KB… 即 0.056 ms/KB**，是我们的 **1/8.7**。TS 的绝对下限说明：如果架构对齐（一次字符扫描、无逐字符对象）,同一个 CPU 上 226 份 dts 可以做到 **0.5s 以内**。
- 注意 TS 在这 226 份里对**语法错误/诊断**几乎不做事（`createSourceFile` 只建树 + 收集 parseDiagnostics），我们额外做了 shape 构建、成员边界、Declaration 组装；倍数**不能全部当作可回收成本**。

### 2.4 规模曲线（`--scale`，lib.dom 内容重复拼接）

| 倍数 | chars | ms/KB | median ms | vs 上一档 | ms/KB 比 |
| ---: | ---: | ---: | ---: | ---: | ---: |
| x1 | 2,349,323 | 0.4871 | 1117.5 | — | — |
| x2 | 4,698,646 | 0.4869 | 2233.9 | x2.00 | x1.000 |
| x4 | 9,397,292 | 0.4859 | 4459.1 | x2.00 | x0.998 |
| x8 | 18,794,584 | 0.4867 | 8933.7 | x2.00 | x1.002 |

回归：0.4867 ms/KB，R²=1，**β=0.999**。

**判定：整体复杂度对输入字节是 O(N)，无超线性。** 因此“把 226 份从 2.0s 压到 X ms”只能靠降**每字符常数**，任何“缓存/记忆化某个结构”的思路最多只能吃掉内容形态带来的 ±70% 波动（§2.1 说明）。

---

## 3. CPU profile 分解

### 3.1 采样口径

- `node --cpu-prof --cpu-prof-dir=tmp/prof --cpu-prof-interval=100 …`；**实测该 interval 开关在 Node 24 未生效**：profile 里 `samples=12293`、`total=11779.7ms` → **≈958 µs/样本**（默认 1000µs）。对 self% 无影响，只影响“短函数是否被采到”。
- self 时间用 `samples` + `timeDeltas` 逐样本累加（比 `hitCount × interval` 准）；inclusive 用 children 子树求和，递归会重复计数，**排序一律按 self**。
- 汇总脚本：`tmp/prof-summary.mjs`（本轮同时以 `tests/bench/prof-summary.mjs` 提交，两者同一份代码）。

### 3.2 按目录自底向上聚合（corpus profile，total 11780 ms）

| self% | ms | 模块 |
| ---: | ---: | --- |
| **43.2%** | 5094 | `core/syntax`（unit-token / syntax-context / token / block-token / catalog-guide / possible-shape…） |
| **26.8%** | 3161 | `core/syntax/basic-tokens`（common / wrap-symbol / symbol / area-annotation / shebang / bracket / string / regex / line-annotation / bom） |
| **18.7%** | 2206 | `typescript/tokens`（source-file-shape / type-builder / member-boundary / 各 shape） |
| 4.3% | 510 | **GC**（`(garbage collector)` 伪节点） |
| 3.8% | 445 | `typescript/run`（source-file-runner / text-document / template） |
| 1.4% | 168 | native（`readFileUtf8` 等） |
| 1.1% | 135 | node internals（模块加载） |
| 0.3% | 34 | `(program)` |
| 0.2% | 26 | bench 自身 |

**→ core 合计 70.0%，typescript 层 22.5%，GC 4.3%，其它 3.2%。**

单文件 lib.dom 的 profile 分布几乎一致（core/syntax 42.6% + basic-tokens 24.8% + ts/tokens 18.5% + run 4.9% + GC 3.9%），说明**这不是小文件噪声**。

按**文件**聚合（corpus，前 16）：

| self% | ms | 文件 |
| ---: | ---: | --- |
| 21.78% | 2565 | `core/syntax/unit-token.js` |
| 11.91% | 1403 | `core/syntax/syntax-context.js`（DrainQueue 6.68 + Process 5.10） |
| 6.15% | 724 | `core/syntax/basic-tokens/common.js` |
| 4.32% | 509 | `core/syntax/basic-tokens/wrap-symbol.js` |
| 4.14% | 487 | `typescript/tokens/types/type-builder.js` |
| 3.83% | 451 | `core/syntax/basic-tokens/symbol.js` |
| 3.82% | 450 | `typescript/tokens/files/source-file-shape.js` |
| 3.57% | 420 | `core/syntax/basic-tokens/area-annotation.js` |
| 3.14% | 370 | `core/syntax/token.js` |
| 3.05% | 359 | `typescript/run/source-file-runner.js` |
| 2.88% | 340 | `typescript/tokens/types/member-boundary.js` |
| 2.71% | 320 | `core/syntax/block-token.js` |
| 2.30% | 271 | `core/syntax/basic-tokens/shebang.js` |
| 2.13% | 251 | `core/syntax/basic-tokens/bracket.js` |
| 2.06% | 243 | `core/syntax/catalog-guide.js` |
| 1.42% | 167 | `core/syntax/basic-tokens/string/string-guide.js` |

按**函数名**聚合：`Process`（全部重载）**28.92%**、`Transit`（全部 token 类）**19.87%**、`DrainQueue` 6.68%、`Parse` 3.05%、`ExitOrPre` 2.80%、`FindMemberBoundary` 2.67%、`Token`/`BlockToken` 构造 1.93%/1.93%、`UnitToken` 构造 1.71%、`ComputeByIndex` 1.43%、`IsAppend` 1.43%、`ComputePossibleShapesByIndex` 1.42%。

### 3.3 Top 30 self-time（corpus）

| # | self% | ms | 函数 | 源文件:行 | 调用者（1–2 层） |
| ---: | ---: | ---: | --- | --- | --- |
| 1 | **20.04%** | 2360 | `UnitToken.Process` | `core/syntax/unit-token.js:34` | `Process`(source-file-shape:57) ← `Process`(process-source:14) |
| 2 | **6.68%** | 787 | `SyntaxContext.DrainQueue` | `core/syntax/syntax-context.js:60` | `ProcessSingle`(:52) ← `Process`(:42) |
| 3 | 5.10% | 601 | `SyntaxContext.Process` | `syntax-context.js:42` | `SourceFileRunner.Parse`(source-file-runner:12) |
| 4 | 4.24% | 500 | `Transit`（wrap-symbol） | `basic-tokens/wrap-symbol.js:23` | `Process`(unit-token:34) ← `Process`(unit-token:34) |
| 5 | 3.78% | 446 | `SourceFileShape.Process` | `tokens/files/source-file-shape.js:57` | `ProcessSource.Process`(:14) ← `DrainQueue` |
| 6 | 3.73% | 440 | `Transit`（common） | `basic-tokens/common.js:444` | `Process`(unit-token:34) |
| 7 | 3.55% | 419 | `Transit`（symbol） | `basic-tokens/symbol.js:64` | `Process`(unit-token:34) |
| 8 | 3.05% | 359 | `SourceFileRunner.Parse` | `run/source-file-runner.js:12` | `parseOnce`(bench) |
| 9 | 2.67% | 315 | `FindMemberBoundary` | `tokens/types/member-boundary.js:55` | `ParseTypeBounded`(type-builder:192) ← `ParseTypeMember`(:783) |
| 10 | 2.30% | 271 | `Transit`（shebang） | `basic-tokens/shebang.js:50` | `Process`(unit-token:34) |
| 11 | 1.92% | 227 | `BlockToken` ctor | `core/syntax/block-token.js:12` | `WrapSymbol`(wrap-symbol:13) ← `Transit`(wrap-symbol:23) |
| 12 | 1.84% | 217 | `ExitOrPre`（area-annotation） | `basic-tokens/area-annotation.js:53` | `Process`(unit-token:34) |
| 13 | 1.67% | 196 | `UnitToken` ctor | `core/syntax/unit-token.js:28` | `Bracket` ctor(bracket:14) ← `Transit`(bracket:73) |
| 14 | 1.58% | 186 | `Token` ctor | `core/syntax/token.js:10` | `Token`(token:21) ← `BlockToken` ctor |
| 15 | 1.42% | 167 | `Transit`（string-guide） | `basic-tokens/string/string-guide.js:13` | `Process`(unit-token:34) |
| 16 | 1.42% | 167 | `CatalogGuide.ComputePossibleShapesByIndex` | `core/syntax/catalog-guide.js:25` | `ComputePossibleShapes`(:22) ← `UnitToken.ComputePossibleShapes`(:15) |
| 17 | 1.31% | 154 | `Common.IsAppend` | `basic-tokens/common.js:17` | `Transit`(common:444) |
| 18 | 1.10% | 129 | `Transit`（bracket） | `basic-tokens/bracket.js:73` | `Process`(unit-token:34) |
| 19 | 0.99% | 116 | `Transit`（regex-token） | `basic-tokens/regex-token.js:85` | `Process`(unit-token:34) |
| 20 | 0.94% | 111 | `ExitOrPre`（bracket） | `basic-tokens/bracket.js:53` | `Process`(unit-token:34) |
| 21 | 0.94% | 110 | `Transit`（line-annotation） | `basic-tokens/line-annotation.js:84` | `Process`(unit-token:34) |
| 22 | 0.85% | 100 | `AreaAnnotation.Undo` | `basic-tokens/area-annotation.js:20` | `ExitOrPre`(:53) |
| 23 | 0.84% | 99 | `Transit`（area-annotation） | `basic-tokens/area-annotation.js:68` | `Process`(unit-token:34) |
| 24 | 0.76% | 89 | `Transit`（bom） | `basic-tokens/bom.js:42` | `Process`(unit-token:34) |
| 25 | 0.66% | 78 | `BlockToken.AppendAndSignOut` | `core/syntax/block-token.js:18` | `Transit`(wrap-symbol:23) |
| 26 | 0.61% | 72 | `ModuleBlockShape.BuildMember` | `tokens/declarations/module-block-shape.js:55` | `FromBracket`(:34) ← `FromUnits` |
| 27 | 0.60% | 71 | `readFileUtf8`（native） | — | `readFileSync`（bench 自身，不计入解析） |
| 28 | 0.57% | 67 | `TextDocument.ProcessLineStartOffsets` | `run/text-document.js:18` | `TextDocument` ctor(:12) ← `Parse` |
| 29 | 0.55% | 65 | `TypeBuilder.ParsePrimaryType` | `tokens/types/type-builder.js:458` | `ParsePostfixType`(:380) ← `ParseIntersection`(:306) |
| 30 | 0.53% | 62 | `TypeBuilder.Load` | `tokens/types/type-builder.js:105` | `BuildMembers`(class-declaration:736) ← `CollectBodyMembers` |

### 3.4 对上一轮 28% 判断的验证与修正

| 上一轮说法 | 本轮实测 | 判定 |
| --- | --- | --- |
| `UnitToken.Process` 16.6% self | **20.04%** | ✅ 方向一致，量级更高（那轮是 8 份语料 + 较短采样，本轮 226 份） |
| `SyntaxContext.DrainQueue/Process` ≈10.8% | `DrainQueue` 6.68% + `Process` 5.10% = **11.78%** | ✅ 一致 |
| `Transit` 三处 ≈7.4%（合计） | 仅 wrap-symbol + common + symbol 三处就是 **11.53%**；**全部 `Transit` 合计 19.87%** | ⚠️ **低估**：那轮只数了三个文件里的 Transit，漏掉 shebang/area-annotation/bracket/string/regex/line-annotation/bom，实际是它的 2.7 倍 |
| “dts 主成本在 core 逐 token 流水线，接口成员扫描已不是主因” | core 70.0%；`catalog-guide` 仅 2.06%，成员/类型构建（`type-builder`+`member-boundary`）7.0% | ✅ **一致**，并给出了确切份额 |
| （未提及）每字符分配 | **3.07 个 `new Source` / char，35 次 Scavenge / 次 lib.dom 解析，GC 4.3%** | 🆕 新增；这是“固定税”的另一半，且是 core 结构决定的 |

**差异原因**：上一轮是 CPU profile 的初判（8 份语料、Top 函数走读），本轮是 226 份全量 + 目录级自底向上聚合 + 计数插桩；前者只能看到“最显眼的几帧”，后者才能回答“core 到底占多少”。

---

## 4. 分配与 GC

### 4.1 GC 读数（`--trace-gc`，lib.dom × 2 次 parse）

| 项 | 值 |
| --- | --- |
| GC 次数 | **73**（71 Scavenge + 2 Mark-Compact）→ **≈35 Scavenge / 次解析** |
| 暂停合计 | **106.9 ms** / 2642 ms 解析 ≈ **4.0%** |
| 单次 Scavenge | 0.5–2.5 ms（尾段升到 7.3 ms） |
| 堆峰值 | **193 MB**（`used_heap_size` 峰值 86.8 MB 时不带 trace） |
| CPU profile 里的 GC self | **4.3%**（corpus）/ 3.9%（lib.dom） |

### 4.2 分配量与分配点

- **计数证据（比采样堆剖面硬）**：lib.dom 单次解析 **`new Source` 7,202,876 次**、`new ProcessSource` **2,361,684 次**；按对象最小 32 B 估，仅这两类就是 **~290 MB 垃圾 / 次解析（≈123 B / 输入字符）**。`--trace-gc` 的 35 次 Scavenge × ~8 MB 半空间 ≈ 280 MB，**两条独立证据吻合**。
- `--heap-prof`（`--heap-prof-interval=16384`）试图定位分配点，但采样堆剖面只覆盖了 ~7 MB 样本（占比被 `readFileSync` 1.9 MB、模块编译 1.4 MB 占据），**不足以做占比结论**；可见的语义分配点是 `splice`(0.1 MB) / `slice` / `TypeBuilder.ParseTypeMember` / `UnitToken.Process` / `Token` ctor。
- 结论：分配的主要来源是**按字符创建对象**，而不是字符串拼接。`String`/数组分配在 profile 里没有独立热点（`TempToString` 未进 Top 30）。

---

## 5. 阶段拆分

### 5.1 每次 Parse 的固定开销（各自独立计时，3 次最小，lib.dom）

| 阶段 | ms | 说明 |
| --- | ---: | --- |
| `TypescriptTemplate.Create()` | 0.007 | 每次 Parse 重建模板，但很便宜 |
| `new SourceFileShape(template)` | 0.036 | 根节点 |
| `new TextDocument(text, name)` | **5.83** | 含 `ProcessLineStartOffsets()`：**整文件再扫一遍换行**，为错误消息建行首表（45,126 行 → 45k 元素数组） |
| `new SyntaxContext(root)` | 0.015 | — |
| **固定地板（template + document）** | **5.83** | **占 Parse 的 0.6%** |
| `Parse` 全量（干净口径，3 次最小） | **1048.7** | — |

**→ “每次 Parse 的固定税”可以忽略（0.6%）。** 这也说明 profile 里 `Parse` 自身 3.05% self 主要是 **V8 把内联的 `SyntaxContext.Process` 记账到了调用者**（实测 `Process` 是独立节点 5.10%，而模板/根/上下文构造合计 <0.1 ms）。**不要单独优化 `Parse`。**

### 5.2 每字符计数（一次 Parse，lib.dom，2,349,323 chars）

| 计数 | 次数 | 每 char | 机制 |
| --- | ---: | ---: | --- |
| `Document.At` → `new Source` | **7,202,876** | **3.07** | 每个位置一个 `Source` 对象（`Pre`/`At`/`EOF` 各建） |
| `Source.Value` → `Document.GetValue` | **14,451,567** | **6.15** | 每次读字符都过一次 getter + 闭包调用 |
| `ProcessSource.Process` | **2,361,684** | **1.005** | **每个字符一个队列项**（`new ProcessSource` + `SourceQueue.splice(0,1)`） |
| `UnitToken.Process` | **8,074,274** | **3.44** | 同一字符被 token 链推进 3.4 次 |
| `Token.Add` | 313,490 | 0.13 | 真正建 shape 节点的次数 |
| `CatalogGuide.ComputePossibleShapesByIndex` | 69,267 | 0.029 | 候选判定，**已经不是主因** |
| 候选集扫描（Σ`Candidates.size`） | 234,835 | — | 每次计算平均扫 3.39 个候选 |

**换算**：`UnitToken.Process` 每次调用的 self ≈ **28 ns**（226ms / 8.07M，lib.dom 口径）；每字符光这一层 ≈ 96 ns，占 446 ns/char 的 ~22%。

### 5.3 局限

- 计数插桩会**替换原型方法**（尤其 `Source.Value` 的 getter），使 Parse 变慢（1693 ms vs 1048 ms）。**因此计数只报次数，不报耗时**；所有计时结论来自未插桩的运行。
- 无法在“不改业务源码”的前提下把时间精确切到 `tokenization / shape build / AST 投影` 三段——因为这三段在同一条 `Process` 驱动链里**交替执行**（每次 token 推进都可能触发一个 shape 的 Build/Close）。本轮改用**模块级自底向上聚合（§3.2）+ 计数（§5.2）** 作为代理，两者互相印证。
- AST 投影**不在 `Parse` 内**（§1 口径），所以“shape 树 + AST 两棵树”的成本不在这 3356 ms 里。

---

## 6. 热点归因表（Top 15）

| # | self% | 热点（文件:行） | 机制：为什么贵 | 优化思路（改哪里、怎么改） |
| ---: | ---: | --- | --- | --- |
| 1 | 20.04 | `UnitToken.Process` `core/syntax/unit-token.js:34` | ①**每个 token 一层 try/catch**（catch 分支 `SourceRange`/`SyntaxException` 让 V8 难以把该函数内联、并保留上下文）；②三个 **megamorphic** 字段读 `this.MountedUnit` / `this.CatalogGuide` / `this.ProcessQueue`（子类有几十种，每次读都是多态查表）；③`for (const item of this.ProcessQueue.Data)` 每次迭代分配迭代器；④`this.LastSource = source` 每次都写 | 把 try/catch 上提到 `SyntaxContext.DrainQueue` 外层（一条 `ProcessSource` 一次 try）；`MountedUnit/CatalogGuide/ProcessQueue` 合并成一个 `Kind` 判别字段 + `switch`；`ProcessQueue` 改索引循环 `for (let i=0;i<n;i++)`；`LastSource` 只在出错时写 |
| 2 | 6.68 | `SyntaxContext.DrainQueue` `syntax-context.js:60` | `SourceQueue.splice(0, 1)` **每项一次数组移动 + 返回数组分配**；`while (length>0)` 每轮 2 次长度读；`DrainMessages` 同构 | 队列改 `head` 索引（`items[head++]`，定期 compaction）或环形缓冲；`DrainMessages` 同理；`ProcessSource` 对象改成 `(owner, source)` 两个数组槽（消除每字符 1 次分配） |
| 3 | 5.10 | `SyntaxContext.Process` `syntax-context.js:42` | 每次 `ProcessSingle` 都 `new ProcessSource` + 立即 `DrainQueue`；`documents.At(i)` 又建一个 `Source` | 与 #2 合并：`ProcessSingle` 直接把 `(owner, source)` 压栈并循环，不再建中间对象 |
| 4 | 4.24 | `Transit`（wrap-symbol）`basic-tokens/wrap-symbol.js:23` | 每字符一次；内部 `source.Value`（getter）、`unit.Template`、`unit.Last()`、`instanceof` 链；命中时 `new BlockToken`（#11） | 与 #9（common）/ #7（symbol）合并成“basic token 预分派”：先取 `text.charCodeAt(i)`（一次），用查表决定进入哪个 token 的 Transit，**不再逐个问** |
| 5 | 3.78 | `SourceFileShape.Process` `tokens/files/source-file-shape.js:57` | 每个 source 项都从根 shape 走一遍 `Process`（根节点承担全部调度），字段多态 | 根节点只保留“当前 mounted unit”直连（`root.Current.Process`），去掉每次从根重新分派 |
| 6 | 3.73 | `Transit`（common）`basic-tokens/common.js:444` | 同上 + `last.TempToString()`（读时拼字符串）/`last.IsExponentPrefix()`；`Common.IsUnicodeEscapeStart` 每字符再判一次 | 同上（预分派）；`TempToString` 结果按 `Data` 版本缓存（`dirty` 标记） |
| 7 | 3.55 | `Transit`（symbol）`basic-tokens/symbol.js:64` | 同上 | 同上 |
| 8 | 3.05 | `SourceFileRunner.Parse` `run/source-file-runner.js:12` | **不是真实工作**：模板/根/上下文构造实测 <0.1 ms，这里是 V8 把内联的 `Process` 记账到调用者 | 不动 |
| 9 | 2.67 | `FindMemberBoundary` `tokens/types/member-boundary.js:55` | 从 `from+1` 线性扫到成员末尾找“换行 + 可结束 + 成员起头”；**单行成员会扫到末尾**，且同一成员被多次 `ParseTypeBounded` 调用时重复扫 | 结果按 `(memberStart)` 记忆化（`scan.Checked` 已有字段但 `Find*` 未用）；或先建一次“换行位置”索引（与 §5.1 的行首表复用） |
| 10 | 2.30 | `Transit`（shebang）`basic-tokens/shebang.js:50` | 只对文件头有意义，却**每个字符都被调用一次**（因为它在链上） | 预分派后按位置跳过（`index>2` 直接不进） |
| 11 | 1.92 | `BlockToken` ctor `core/syntax/block-token.js:12` | 每次 wrap 都新对象（`Token` 有 13 个字段，含 `SourceRange` 对象），构造即 2 次分配 | 字段扁平化（`SourceRange` 改成 2 个数值字段），或对象池 |
| 12 | 1.84 | `ExitOrPre`（area-annotation）`basic-tokens/area-annotation.js:53` | 每 token 一次；内部 `Undo`（#22）走 `WhichUnitRangeContains` **反向线性扫 Data** | `WhichUnitRangeContains` 用“最后已知索引”起步（单调位置），避免每字符从尾扫 |
| 13 | 1.67 / 1.58 | `UnitToken` ctor / `Token` ctor | 同 #11 | 同 #11 |
| 14 | 1.42 | `CatalogGuide.ComputePossibleShapesByIndex` `catalog-guide.js:25` | 遍历 `Set` 候选 + `Array.from(Set)` 取唯一候选 + `Reset()` 清空再全量 `add`；每 token 一次 | `Candidates` 改 `Uint8Array`/位图或索引数组；`Reset` 只恢复 `Reject` 掉的位；`Array.from` 换成“第一个未被删的索引” |
| 15 | 1.31 | `Common.IsAppend` `basic-tokens/common.js:17` | 每字符两次 `Src.Value` getter + `UnicodeBraceEscapeDigits/Value` 循环 | 与 #6 合并；`IsAppend` 接收已取出的字符与 `code`，不再自己读 source |

> 备注：`ProcessLineStartOffsets`（0.57%）与 `tempaltes`、`Parse`（#8）都在“可以顺手做、但收益 <1%”一档。

---

## 7. 与上一轮 perf-sweep 结论的对照

| 项 | 上一轮（profile 初判） | 本轮（226 份全量 + 计数） | 一致性 |
| --- | --- | --- | --- |
| 主成本位置 | core 逐 token 流水线（`UnitToken.Process` 16.6% / `DrainQueue`+`Process` 10.8% / `Transit` 三处 7.4%） | `UnitToken.Process` **20.04%** / `DrainQueue`+`Process` **11.78%** / 全部 `Transit` **19.87%** | ✅ 一致，Transit 被**低估 2.7 倍** |
| 接口成员扫描 | 已不是主因 | `catalog-guide` 2.06%，`ComputePossibleShapesByIndex` 1.42%，候选集每次仅扫 3.39 个 | ✅ 一致 |
| core 占比 | “28% 左右” | **70.0%**（core/syntax 43.2% + basic-tokens 26.8%） | ❌ 修正：28% 只是“最显眼的三族函数”，不是 core 的份额 |
| 分配/GC | 未量化 | 每字符 3.07 个 `Source`、35 次 Scavenge/解析、GC 4.3%、~290 MB 垃圾/解析 | 🆕 新增，是下一轮最值得动的方向 |
| 规模复杂度 | 未测 | β=1.008 / scale β=0.999，**严格线性** | 🆕 新增：排除超线性，只可能是常数问题 |
| 8 份端到端 | 1970–2110 ms | 2067.4 ms（`parse-perf --dts 8`） | ✅ 复现 |

差异原因：初判只能看 Top 帧和函数名，看不到“目录合计”和“每字符计数”；本轮把“多少时间”与“多少调用/分配”对齐后，结论从“三族热点”升级为“**core 的每字符固定税**”。

---

## 8. 结论：把 226 份 dts 从 3356 ms 压到多少

### 8.1 目标区间

| 场景 | 预期 | 依据 |
| --- | --- | --- |
| 现状 | **3356 ms**（226 份）/ 2067 ms（8 份） | §2.1 |
| 只改 typescript 层（不动 core） | **3100–3250 ms（−3%~−8%）** | `member-boundary` 2.88% + `type-builder` 4.14% + 行首表 0.57% 里可回收的部分 |
| 改 core：Source 值化 + 队列去 splice + Process 瘦身 | **1500–1900 ms（−43%~−55%）** | 每字符 3.07 分配 + 1 队列项 + 20% Process self 中可回收的 60–70% |
| 再加 basic-token 字符级预分派 | **1200–1500 ms（−55%~−64%）** | basic-tokens 26.8% 中约一半是“依次问一遍”的调度成本 |
| TS 参照（下限） | 394 ms（带父指针）/ 284 ms | §2.3；再往下需要“一次性字符扫描 + 直接建树”的架构重写，不再是优化 |

### 8.2 按“收益 × 风险”排序的 5 件事

| 优先 | 动作 | 预期收益 | 风险 / 是否必须改 core | 具体改动位置 |
| ---: | --- | --- | --- | --- |
| **1** | **`Source` 值化/池化**：`{Document, Index}` 改成 `(document, index)` 传参或复用实例；`Document.At`/`Pre`/`EOF` 不再分配 | **−15%~−25%**（3.07 次/char 分配 + GC 4.3% + getter 间接） | **必须改 core**（`core/syntax/source.xl.md`、`document.xl.md`，牵动所有 `Source` 使用者）；语义风险中 | `core/syntax/source.xl.md:Source`、`document.xl.md:At/GetValue` |
| **2** | **队列去 `splice`**：`SourceQueue`/`Messages` 改 head 索引或环缓冲，`ProcessSource` 改成并行数组槽 | **−8%~−12%**（`DrainQueue` 6.68% + 每字符 1 次对象 + splice 分配） | **必须改 core**（`syntax-context.xl.md`、`process-source.xl.md`）；语义风险低（纯数据结构） | `core/syntax/syntax-context.xl.md:DrainQueue/DrainMessages/ProcessSingle` |
| **3** | **`UnitToken.Process` 瘦身**：try/catch 上提、三字段合并成 `Kind` 判别、`for…of` 改索引、`LastSource` 懒写 | **−10%~−18%**（20.04% self 中大部分是调度税） | **必须改 core**（`unit-token.xl.md` + 所有 token 子类的 `MountedUnit/CatalogGuide/ProcessQueue` 约定）；语义风险中高（异常包装位置变了） | `core/syntax/unit-token.xl.md:Process`、`token.xl.md` 字段 |
| **4** | **basic-token 字符级预分派**：一次 `charCodeAt` 查表决定进哪个 `Transit`，不再逐字符问 9 个类；`shebang`/`bom` 按位置短路 | **−10%~−15%**（basic-tokens 26.8%，其中调度而非语义的部分） | **必须改 core**（`basic-tokens/*` 的 `Transit` 契约 + 模板里的链序）；语义风险高（要保证与原链等价） | `core/syntax/basic-tokens/*.xl.md`、`typescript/run/typescript-template.xl.md` |
| **5** | **typescript 层局部修补**：`FindMemberBoundary` 结果记忆化、`ProcessLineStartOffsets` 惰性化、`CatalogGuide.Candidates` 位图化 | **−3%~−8%** | **不需要改 core**（只动 typescript 层 + `catalog-guide` 边界）；风险低 | `typescript/tokens/types/member-boundary.xl.md`、`run/text-document.xl.md`、`core/syntax/catalog-guide.xl.md` |

### 8.3 给用户的一句话结论

> 现在这 3.4 s 不是“某个算法慢”，而是 **core 的每字节固定税**：**每个输入字符**都要付出 3 次对象分配、6 次逐字符读取、1 个队列项、3.4 次 `UnitToken.Process`（各带 try/catch 与多态字段读），再被 basic-token 链逐级问一遍。它与输入严格线性（β≈1），所以**任何缓存/记忆化都不会有效**；要进 1.2–1.5 s，必须动 core 的四件事（Source 值化、队列、Process、字符预分派），**这需要用户批准**。

---

## 附录 A：新增工具

### `tests/bench/dts-profile.mjs`

| 参数 | 作用 |
| --- | --- |
| `--corpus` | 226 份 `*.d.ts` 逐份 `Parse`，输出每份 median/min/max、合计、每份分布（中位/均值/p90）、ms/KB、OLS 斜率与 log-log 指数、GC/堆读数 |
| `--file <path>` | 单文件 warmup+repeat，报 min/median/max/mean/stdev/spread、GC 次数与暂停、堆前后与峰值 |
| `--ts` | 同批文件与 `ts.createSourceFile`（`setParentNodes` true/false 各一遍）对照，给出 ours/TS 倍数 |
| `--scale 1,2,4,8` | 最大文件重复拼接，输出总耗时曲线与 β，判定是否 O(N) |
| `--top N` | 只打印耗时最大的 N 份 |
| `--repeat R` / `--warmup W` / `--gc` / `--json` | 重复与预热次数、样本间强制 GC（需 `node --expose-gc`）、机器可读输出 |

确定性：无随机数、无网络、不写文件（`--json` 只写 stdout）；同一输入同一次序。

### `tests/bench/prof-summary.mjs`

`node --cpu-prof` 产物的汇总器：Top self 时间（函数 + `文件:行` + 调用者链）、按目录/文件聚合、GC/`(program)`/`(idle)` 占比、`--json`。用法：

```powershell
node tmp/prof-summary.mjs tmp/prof/*.cpuprofile --top 30
```

### 未提交的临时脚本（`tmp/`，仅用于本轮取证）

- `tmp/stage-split.mjs`：阶段计时（template/shape/TextDocument/SyntaxContext）+ 每字符计数插桩（`Document.At`/`Source.Value`/`ProcessSource.Process`/`UnitToken.Process`/`Token.Add`/`CatalogGuide`）。
- `tmp/heap-summary.mjs`：`--heap-prof` 产物按函数聚合（本轮样本不足，结论未采用）。

## 附录 B：本轮纪律

- 未修改任何 `.xl.md`、未修改 `core`/`typescript` 源码、未 `git push`。
- 提交内容：`tests/bench/dts-profile.mjs`、`tests/bench/prof-summary.mjs`、`docs/dts-perf-profile.md`（分支 `dts-profile`）。
- 计时数字均来自独立进程、未挂 profiler 的运行；带 profiler 的读数已在文中标注（lib.dom 1697 ms）。
