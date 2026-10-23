# DTS 解析性能：优化总报告（DTS-PERF 研究轮 · 定稿）

> 面向决策的收敛稿。把三份材料合成一份可拍板的文档：
> - 画像 `dts-profile/docs/dts-perf-profile.md`（226 份全量 + CPU profile + 每字符计数）；
> - 清单 `dts-survey/docs/dts-optimization-ideas.md`（P01–P23、Top5 路线、不建议 10 条、5 个假设）；
> - 原型实测：三个研究分支 `dts-proto-comment` / `dts-proto-drive` / `dts-proto-combined`。
>
> 本轮**不改业务 `.xl.md`，不改 `core` / `typescript` 源码**；只产出本报告、`docs/Final.md` 的索引更新，以及两份测量脚本的拷贝。凡涉及 core 的改动，一律标「需用户批准」。
> 计量口径统一为 `SourceFileRunner.Parse(text, fileName)`：**字符流 → 形状树**，不含 AST 投影，不含 `readFileSync`。

---

## 1. TL;DR（决策摘要）

1. **现状**：226 份 `.d.ts`（7,094,521 B，typescript/lib 110 + @types/node 72 + undici-types 44）合计 **3356 ms**（0.484 ms/KB，中位 1.41 ms/份）；8 份大文件（4.06 MB）合计 **2058–2065 ms**，其中 `lib.dom.d.ts` 一份 **1086 ms** 占 8 份的 53%。
2. **参照**：同一批 226 份走 `ts.createSourceFile` 是 **394 ms**（带父指针）/ **284 ms**（不带）→ 我们 **x8.97 / x12.43**。TS 每字符约 55 ns，我们约 470–490 ns。倍数在 x6.5–x12.8 之间稳定，与文件大小/语法形态无关。
3. **不是算法问题**：226 份回归斜率 0.487 ms/KB、log-log **β=1.008**，`lib.dom` 内容拼 1/2/4/8 倍后 ms/KB 恒定（β=0.999）。**严格 O(N)**，没有超线性项，任何缓存/记忆化都不改变量级。
4. **是每字符常数问题**：每个输入字符要付 **3.07 次 `new Source` + 6.15 次逐字符读取 + 1.005 个队列项 + 3.44 次 `UnitToken.Process`**，换来 **GC 4.3%、~290 MB 垃圾/次解析、35 次 Scavenge**。CPU 时间 **70% 在 `core`**（`core/syntax` 43.2% + `basic-tokens` 26.8%），typescript 层只有 22.5%。
5. **两条已验证原型**（本轮复跑，口径与噪声见 §2、数字见 §5）：
   - **A 注释/空白整段快速路径**：8 份 **1982.5 → 1556.2 ms（−21.5%，原型作者口径）**；本会话跨批次复跑 **−16% ~ −19%**，`lib.dom` 提速 **x1.22 ~ x1.38**，`lib.es5` 约 x1.7。5 个文件 +231/−1，core 默认钩子为 no-op，**未改 basic-tokens**。
   - **B 驱动层去税**：**2082.2 → 1666.6 ms（−20.0%）**；仅 `core/syntax/syntax-context.xl.md` **+33/−2**；本会话复跑 **−17% ~ −19%**。
   - **C 组合（A+B）**：**2065.5 → 1450.2 ms（−29.8%，作者会话口径，噪声带上沿）**；本会话复跑 **1452.3 / 1525.7 ms（−25.9% ~ −29.4%）**；**独立复验同进程 A/B −26.33% / −27.55%、跨进程整目录替换中位 −25.5%（x1.341）→ 对外口径 −26% ± 1.5**。5 个文件 +264/−3、**0 basic-tokens 改动**，token 树摘要 + XML **8/8 等价**（语料范围见 §7.2，唯一例外见 §7.5），7 项门禁逐项不变。
6. **组合是次可加**：−21.5% 与 −20.0% 叠加得到 −29.8%，不是 −37%。两者吃的是**同一段每字符税**（`Source` 分配、队列项、`Process` 帧），只是从不同入口少走一遍；剩下的税必须动 core 才能再降。
7. **可达区间**（§6 分阶段）：阶段 1 合并 C → 8 份 ~1450 ms、226 份约 **2.35 s（−30%）**；阶段 2 低风险非 basic-tokens 项再 −4~7%；阶段 3 动 core（`Source` 值化、`UnitToken.Process` 瘦身、basic-token 字符预分派）→ **1200–1500 ms**；阶段 4 架构级（一次字符扫描直接建树）才可能接近 TS 的 394 ms。
8. **需要用户拍板的三件事**：① 合并 C 到主仓；② 是否批准 core 的 `Source` 值化/池化（最大单项，−15~25%）；③ 是否发起 basic-tokens 改动（`Process` 瘦身 + 字符级预分派，合计 −20~30%，但语义风险最高）。
9. **一处必须记账的边界差异**：`/*/` 之后同文件再出现 `*/` 时，基线与组合的 token 树不同（基线甚至抛「不支持的表达式起点」）。根因是基线用**物理前一个字符**判 `*/`，方向是**组合更符合 ECMAScript/TS 词法**；该形态在 1875 份语料 + 226 d.ts + 6167 用例中 **0 命中**，不影响门禁。详见 §7.5。

---

## 2. 测量口径与噪声（先读这一节，再读任何数字）

### 2.1 脚本与参数

| 用途 | 脚本 | 参数 | 口径 |
| --- | --- | --- | --- |
| 8 份大文件端到端 | `tests/bench/parse-perf.mjs` | `--dts 8 --repeat 3`（warmup 1） | 每份独立 `Parse` 计时，取 **median**，`TOTAL` = 各份 median 之和 |
| 226 份全量 | `tests/bench/dts-profile.mjs` | `--corpus`（warmup 1 + repeat 2） | 每份 median 之和；另出 ms/KB、OLS、β、GC/堆 |
| TS 对照 | 同上 | `--ts` | `ts.createSourceFile`，`setParentNodes` true/false 各一遍 |
| 规模曲线 | 同上 | `--scale 1,2,4,8` | `lib.dom` 内容重复拼接，看 β |
| 同进程 A/B | `tests/bench/dts-ab.mjs`（survey 分支） | 交替 5 轮取中位 | 在 `build/ts-exp` **副本**上打补丁，基线/实验交替跑 |
| 每字符计数 | `tests/bench/dts-cost-probe.mjs`（survey 分支） | `--count` / `--micro` | 包装原型方法计数；**只报次数，不报耗时** |

`Parse` 只建 **shape 树**（`SourceFileShape`），**不投影 AST**（画像 §1 已实测确认）。所以与 `ts` 的倍数只能当**量级上界**：TS 那 394 ms 里没有 shape 构建、成员边界、Declaration 组装，也没有诊断。

### 2.2 为什么数字会飘

| 干扰源 | 量级 | 处理 |
| --- | --- | --- |
| 同进程内样本散布 | `lib.dom` spread **x1.06**；8 份里小文件可到 x1.2（`lib.es2015.core` 8.9–16.0 ms） | 取 median，不看 min/max |
| **跨批次 / 机器热状态** | 同一分支同参数，两次相邻批次可差 **±5%**；本会话 `combined` 先得 1452.3 ms、约 3 分钟后同参数得 1525.7 ms（**+5.1%**） | **只在同一批次内比较**；跨批次只比「同批次内基线 vs 实验」 |
| 进程隔离 | 每个分支/模式一个独立进程（JIT 状态不共享） | 分支之间天然不可直接相减 |
| profiler | `--cpu-prof` / `--heap-prof` 让 `lib.dom` 1104 → 1697 ms（**+46%**） | 所有计时结论都取自**不带 profiler** 的运行 |
| 计数插桩 | 替换 `Source.Value` getter 后 1048 → 1693 ms（+61%） | 计数只用于「次数」，不用于「耗时」 |
| 语料差异 | 8 份 4.06 MB vs 226 份 7.09 MB，前者占后者 **60%** 的时间；后 200 份合计 <10% | 8 份数字**不能**线性外推到 226 份的总时间占比 |

**因此**：本报告里出现的百分比，凡是**同一批次内**测的（A/B 交替、C 与基线背靠背）可以当结论用；凡是**跨批次、跨分支**的（例如「A −21.5%」与「本会话 A −16.3%」），只能当**区间**读，差值本身不是结论。dts 合计的合理误差带是 **±5%**，跨会话（不同时间、不同机器热状态）的数字**不可比**。

### 2.3 本报告数字的来源标记

- 标 **「画像」**：取自 `dts-profile/docs/dts-perf-profile.md`（该文自报一次完整运行，226 份 3356.4 ms）。
- 标 **「Lead 口径」**：任务下发时给出的原型自报值（A/B/C 三组）。
- 标 **「本会话复跑」**：本轮在 `dts-report` / 三个原型分支上实跑的 `parse-perf --dts 8 --repeat 3`（两次批次，见 §5.4）。
- 标 **「独立复验」**：`dts-verify` 在 `dts-proto-combined @ 2284b883` 的**自建克隆**上独立跑的读数（同进程 A/B 交替、跨进程整目录替换、逐文件、跳过字符占比），见 §5.5 与 §9.4。

---

## 3. 画像证据（摘自 `dts-perf-profile.md`，数字均为该文实测）

### 3.1 端到端与规模（画像 §2.1 / §2.4）

| 指标 | 226 份 | 8 份 | 说明 |
| --- | ---: | ---: | --- |
| 合计（median 之和） | **3356.4 ms** | **2067.4 ms** | 8 份来自 `parse-perf --dts 8` |
| 归一化 | 0.484 ms/KB | 0.503 ms/KB | 结构一致 |
| 每份 median / 均值 | 1.41 / 14.85 ms | — | p90 17.3 ms，最大 1086.5 ms |
| OLS（ms vs KB） | 0.487 ms/KB，R²=0.987 | — | 截距 −0.09 ms（≈0） |
| log-log 指数 | **β=1.008** | — | 线性 |
| 峰值 `used_heap_size` | 278 MB | 193 MB | — |
| GC self（CPU profile） | **4.3%** | 3.9% | — |

规模曲线（`--scale`，`lib.dom` 拼接）：

| 倍数 | chars | median ms | ms/KB |
| ---: | ---: | ---: | ---: |
| x1 | 2,349,323 | 1117.5 | 0.4871 |
| x2 | 4,698,646 | 2233.9 | 0.4869 |
| x4 | 9,397,292 | 4459.1 | 0.4859 |
| x8 | 18,794,584 | 8933.7 | 0.4867 |

结论：**ms/KB 不随体积变**（β=0.999）。单价由「内容形态」决定——`typescript.d.ts` 0.684 ms/KB、`inspector.generated.d.ts` 0.637，比 `lib.dom` 的 0.474 高 40%，而它们只有 2–3 条语句（巨型 `declare module` + 深嵌套 + 高 JSDoc 密度）。

### 3.2 与 `ts.createSourceFile` 对照（画像 §2.3）

| 文件 | ours ms | ts ms | ts(noParents) | ours/ts |
| --- | ---: | ---: | ---: | ---: |
| lib.dom.d.ts | 1130.0 | 127.0 | 82.9 | x8.90 |
| lib.webworker.d.ts | 449.8 | 35.3 | 26.9 | x12.75 |
| typescript.d.ts | 428.2 | 48.1 | 26.6 | x8.89 |
| inspector.generated.d.ts | 170.3 | 14.4 | 12.0 | x11.81 |
| crypto.d.ts | 108.0 | 11.0 | 8.6 | x9.80 |
| lib.es5.d.ts | 88.7 | 12.0 | 9.0 | x7.40 |
| http2.d.ts | 87.9 | 10.4 | 6.3 | x8.46 |
| fs.d.ts | 76.1 | 11.8 | 9.4 | x6.47 |
| **226 份合计** | **3535.4** | **394.3** | **284.5** | **x8.97** |

> 注：这一行的 3535.4 ms 与 §3.1 的 3356.4 ms 来自不同运行（`--ts` 档 repeat=1），差值 5% 属 §2.2 的跨批次噪声，**不要**把两个数放一起做减法。

### 3.3 每字符计数（画像 §5.2，lib.dom 单次解析，2,349,323 chars）

| 计数 | 次数 | 每 char | 机制 |
| --- | ---: | ---: | --- |
| `Document.At` → `new Source` | 7,202,876 | **3.07** | 每个位置一个 `Source`（`Pre`/`At`/`EOF` 各建） |
| `Source.Value` → `GetValue` | 14,451,567 | **6.15** | 每次读字符过一次 getter + 闭包 |
| `ProcessSource.Process` | 2,361,684 | **1.005** | **每字符一个队列项** + `splice(0,1)` |
| `UnitToken.Process` | 8,074,274 | **3.44** | 同一字符被 token 链推进 3.4 次 |
| `Token.Add` | 313,490 | 0.133 | 真正建 shape 节点的次数（≈7.5 字符/token） |
| `CatalogGuide.ComputePossibleShapesByIndex` | 69,267 | 0.029 | 候选判定，**已不是主因**（每次平均扫 3.39 个候选） |

换算：`UnitToken.Process` 单次 self ≈ 28 ns → 每字符仅这一层 ≈ 96 ns，占 446 ns/char 的 ~22%。

### 3.4 分配与 GC（画像 §4）

| 项 | 值 |
| --- | --- |
| `new Source`（lib.dom 单次） | **7,202,876** |
| `new ProcessSource`（单次） | 2,361,684 |
| 垃圾估算（按 32 B/对象） | **~290 MB / 次解析（≈123 B / 输入字符）** |
| GC 次数（2 次 parse） | 73（71 Scavenge + 2 Mark-Compact）→ **≈35 次/解析** |
| GC 暂停 | 106.9 ms / 2642 ms ≈ **4.0%** |
| 堆峰值 | 193 MB（`--trace-gc`）/ 86.8 MB（不带） |

两条独立证据吻合（计数估算 290 MB vs Scavenge × 半空间 ≈ 280 MB）→ **主要分配来源是「按字符建对象」，不是字符串拼接**。

### 3.5 热点 Top 10（画像 §3.3，self%，corpus profile）

| # | self% | 函数 | 位置 | 为什么贵（摘） |
| ---: | ---: | --- | --- | --- |
| 1 | **20.04** | `UnitToken.Process` | `core/syntax/unit-token.js:34` | 每 token 一层 try/catch + 三个 megamorphic 字段读 + `for…of` 迭代器 |
| 2 | 6.68 | `SyntaxContext.DrainQueue` | `syntax-context.js:60` | 每项一次 `splice(0,1)` + 返回数组分配 |
| 3 | 5.10 | `SyntaxContext.Process` | `syntax-context.js:42` | 每字符 `new ProcessSource` 后立即 Drain |
| 4 | 4.24 | `Transit`(wrap-symbol) | `basic-tokens/wrap-symbol.js:23` | 每字符问一遍；内部 getter + `instanceof` 链 |
| 5 | 3.78 | `SourceFileShape.Process` | `tokens/files/source-file-shape.js:57` | 每个 source 都从根重新分派 |
| 6 | 3.73 | `Transit`(common) | `basic-tokens/common.js:444` | 同上 + `TempToString()` 拼接 |
| 7 | 3.55 | `Transit`(symbol) | `basic-tokens/symbol.js:64` | 同上 |
| 8 | 3.05 | `SourceFileRunner.Parse` | `run/source-file-runner.js:12` | **不是真实工作**（V8 把内联的 Process 记到调用者） |
| 9 | 2.67 | `FindMemberBoundary` | `typescript/tokens/types/member-boundary.js:55` | 从成员头线性扫到成员尾，同一成员重复扫 |
| 10 | 2.30 | `Transit`(shebang) | `basic-tokens/shebang.js:50` | 只对文件头有意义，却每字符都被调用 |

按目录自底向上聚合（画像 §3.2，total 11780 ms）：`core/syntax` **43.2%** + `basic-tokens` **26.8%** = **core 70.0%**；`typescript/tokens` 18.7%；`typescript/run` 3.8%；GC 4.3%。

> 画像修正了上一轮的一个判断：「core ≈28%」只是最显眼的三族函数之和；按目录聚合 core 实为 **70%**，「`Transit` 三处 7.4%」实为 **19.87%**（低估 2.7 倍）。这条修正决定了本轮的路线选择——**只在 typescript 层修补，收益上限只有 −3~−8%**。

## 4. 优化清单（决策表，压缩自 P01–P23）

列说明：**收益**是该条单独落地时的估算/实测区间（画像与清单口径）；**改 core** 分三档——「否」只动 typescript 层；「钩子」是 core 加默认 no-op 的扩展点、行为不变；「是」是 core 语义改动，**需用户批准**。**本轮验证**指三个原型分支实际覆盖到的条目。

| 编号 | 改哪里（file:line） | 机制 | 预期收益 | 风险 | 改 core | 本轮验证 |
| --- | --- | --- | ---: | --- | --- | --- |
| **P01** | `core/syntax/basic-tokens/area-annotation.xl.md:101-155` + `templates/template.xl.md` | `/* … */` 先 `indexOf("*/")` 整段切片，`SkipTo` 让驱动层跳过注释正文；`Tmp` 用原文 `substring` 一次算出 | **−12~17%**（A 实测含） | 中：未闭合注释必须落回逐字符 | **钩子**（`PreAdvance` 默认 null） | ✅ A |
| **P02** | `line-annotation.xl.md:50-175` + 同一 `SkipTo` | 行注释按行终止符整段跳读（CRLF 先断 `\r`） | −3~5% | 低 | 钩子 | ✅ A（同一路径） |
| **P19** | `wrap-symbol.xl.md:67-89` + 同一 `SkipTo` | 空白 run 一次扫到非空白 | −1.5~2.5% | 低 | 钩子 | ✅ A（同一路径） |
| **P03** | `core/syntax/syntax-context.xl.md:108-156`（`Process`/`ProcessSingle`/`DrainQueue`） | 队列空时直接 `owner.Process`，不 `new ProcessSource`、不 push；`Reload` 仍走 `splice` 队首 | **−8~12%** | 中：LIFO 队首语义 | 是 | ✅ B |
| **P06** | `syntax-context.xl.md:164-184`（`DrainMessages`） | 空队列首行早返回 | −0.5~1% | 极低 | 是 | ✅ B |
| **P05** | `core/syntax/source.xl.md:66-89`（`Pre`） | 删掉两次 `GetCount()` 闭包调用（上界由 `At` 保证） | ~−1.2% | 极低 | 是（trivial） | ⬜ |
| **P07(1)(2)** | `core/syntax/unit-token.xl.md:98-134` | `for…of` 改索引循环；`LastSource` 收成单出口 | −3~6% | 低 | 是 | ⬜ |
| **P07(3)** | 同上（try/catch 上提） | 一条 `ProcessSource` 一次 try；异常位置改由上下文携带 | 含在上面区间内 | **中高**：异常构造点变了 | 是 | ⬜（建议单独一步） |
| **P13** | `core/syntax/templates/symbol-template.xl.md:71-116` | `ClassOf` 一次算出字符类（256 项缓存），替代 2~4 次 `IsSymbol/IsWhiteSpace/IsNumber` | −1~2% | 中：四个可配置数组的缓存失效 | 是 | ⬜（P04 前置） |
| **P04** | `template.xl.md:99-129` + `unit-token.xl.md` | 首字符分派表，每字符只问 2~3 个 `Transit`（现在 10 个全问） | **−8~12%** | **高**：必须逐字符证明「认领者不变」 | 是 | ⬜ |
| **P14** | `document.xl.md` / `source.xl.md:41-54` | `CharCodeAt` 替代 `Value` getter，热判定比 charCode | −1~1.7% | 中：漏一处即静默差异 | 是 | ⬜ |
| **P09** | `core/syntax/catalog-guide.xl.md:27-134` | `Candidates:Set<int>` → `Uint8Array` + `onlyIndex`，`Reset` 改 `fill(1)` | −0.5~1% | 低 | 是 | ⬜ |
| **P10** | `possible-shape-cache.xl.md:27-55` | `constructor.name` 键 → 静态槽位（38.8 ns → 4.5 ns/次） | ~−0.5% | 低 | 是（+20 处调用点） | ⬜ |
| **P15** | `source-file-end-possible-shape.xl.md:57-156` | `ItemStart` 缓存成 O(1)，ASI 回扫去重（`typescript.d.ts` 的 O(n²)） | 20~60 ms（ts.d.ts 更高） | 低 | 否 | ⬜ |
| **P11** | `tokens/files/source-file-shape.xl.md:68-90` | `Close` 改单遍写指针压缩，去 `slice()` + `filter` | 5~15 ms | 低 | 否 | ⬜ |
| **P18** | `basic-tokens` 4 处（common/symbol/wrap-symbol/bracket） | `Add` 的返回值直接用，删 `unit.Last()` 二次取 | 3~5 ms | 极低 | 是 | ⬜ |

**为什么只有 15 条**：P08（`Temp` 延迟化）、P12/P22（`TypeBuilder` 数组重建与 `>>` 虚拟符号）、P16/P17（建造器池化/数组复制）、P20（regex 回扫）、P21（ItemUtil 缓存）、P23（按首 token 裁候选）单条都在 **−0.2~2%**，且大半依赖 P12/P15 先落地；它们该进「阶段 2 之后的收尾」，不该占决策位。P23 另有门禁风险（候选表写错就是「没有候选形状」硬失败），建议阶段 4 之后再评估。

### 4.1 不建议做（保留 6 条，含画像/清单的理由）

| 想法 | 为什么不 | 出处 |
| --- | --- | --- |
| 优化 AST 投影（`typescript/ast/**` 的 `ParseFromShape` / `map` / 字面量） | **不在计量路径上**：`Parse` 只返回 shape 树，AST 由消费方按需生成；AST 层多处还是桩 | 清单 §4 |
| `Worker` / 子进程并行解析 | 单文件是纯串行状态机（`SourceQueue`/`Messages`/`VariableMap` 全可变）；`--dts` 逐份串行计时，跨文件并行不改变任何一份的延迟 | 清单 §4 |
| 把 `Source` **复用成同一个可变实例**（对象池） | `SourceRange.Start/End` **长期持有 `Source` 引用**（`source-range.xl.md:21-27`），复用会让所有已签出的范围串味。能减的只有 `At` 的**调用次数**或改成**值语义**（§6 阶段 3），不是池化实例 | 清单 §4 + 本轮澄清 |
| 缓存「上一份文件的形状树」 | 真实场景每份 `.d.ts` 只解析一次；缓存只对 bench 的 repeat 循环有效，是自欺 | 清单 §4 |
| 关掉 `try/catch`（不做位置补偿） | `SyntaxException` 的范围与 `^` 指示是门禁的一部分，删掉直接违反门禁 | 清单 §4 |
| 按扩展名（`.d.ts`）裁剪候选/开专用入口 | `.d.ts` 里仍有表达式、`export =`；按文件名开岔路会改 AST。只能按**条目首 token** 动态裁剪（P23） | 清单 §4/P23 |
| 全仓把 `constructor.name` 换成字面量 | 只有 20 处在热路径（P10 已覆盖）；其余 50 处在异常消息里，改了没收益 | 清单 §4 |

---

## 5. 已落地原型（本轮实测）

三个分支都基于主仓 `ffc0515a`，**未合主仓、未 push**。

### 5.1 三组改动面

| 组 | 分支 @ SHA | 文件数 / 行数 | 改了什么 | 0 basic-tokens？ |
| --- | --- | --- | --- | --- |
| **A** 注释/空白快速路径 | `dts-proto-comment` @ `b7a50d35` | 5 文件 **+231/−1** | `document.xl.md` +8（可选原文访问口）、`syntax-context.xl.md` +13（`SkipTo` 钩子）、`templates/template.xl.md` +19（`PreAdvance` 默认 no-op）、`run/text-document.xl.md` +1（`Content` 暴露）、`run/typescript-template.xl.md` **+191**（DTS 专用整段跳读） | ✅ 是（basic-tokens 一行未动） |
| **B** 驱动层去税 | `dts-proto-drive` @ `be9661f6` | 1 文件 **+33/−2** | 仅 `core/syntax/syntax-context.xl.md`：`ProcessSingle`/`ProcessAt` 队列空快路径、`DrainMessages` 早返回；`DrainQueue` 保留 `splice(0,1)` 与 `Reload` 语义 | ✅ 是 |
| **C** 组合 | `dts-proto-combined` @ `2284b883` | 5 文件 **+264/−3** | A ∪ B；冲突区 `syntax-context.xl.md` 由 ort 自动合并（hunk 不重叠），逐条核对：先问 `Template.PreAdvance` 整段跳读，再走队列空快路径 | ✅ 是 |

> 值得注意：**A 把一条「必须改 core」的提案降级成了「钩子」**。core 只加了 19 行默认 no-op 的扩展点（`Template.PreAdvance` 返回 `-1` 即不跳），所有 DTS 语义都落在 `TypeScriptTemplate` 覆写里（+191 行）。这正是「core 行为不变、快路径可回退」的形态：其它语言模板不受影响，出问题只需删掉覆写。

### 5.2 逐文件读数（本会话复跑，`--dts 8 --repeat 3`，ms）

批次 1 = 基线 → C 背靠背（同一时段，可直接相减）；批次 2 = A → B → C 连续三次（同批次内可互比，与批次 1 的基线**跨批次，只能当区间**）。

| 文件 | 基线(b1) | C(b1) | Δ vs 基线 | A(b2) | B(b2) | C(b2) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| lib.dom.d.ts | 1085.6 | **717.4** | **−33.9%** | 888.8 | 927.8 | 762.7 |
| lib.webworker.d.ts | 398.5 | 303.7 | −23.8% | 307.8 | 318.0 | 296.2 |
| typescript.d.ts | 406.8 | 342.9 | −15.7% | 411.9 | 357.2 | 367.2 |
| lib.es5.d.ts | 113.1 | 60.5 | −46.5% | 67.8 | 74.5 | 63.0 |
| lib.es2023.array.d.ts | 14.6 | 8.6 | −41.0% | 14.1 | 11.4 | 10.4 |
| lib.es2020.bigint.d.ts | 17.9 | 9.5 | −47.1% | 13.7 | 12.4 | 13.6 |
| lib.es2015.core.d.ts | 15.0 | 5.5 | −63.1% | 13.2 | 7.5 | 6.8 |
| lib.es2015.symbol.wellknown.d.ts | 6.8 | 4.1 | −38.9% | 6.2 | 5.2 | 5.8 |
| **TOTAL** | **2058.2** | **1452.3** | **−29.4%** | **1723.6** | **1713.9** | **1525.7** |

读法：
- **C 的收益集中在 `lib.dom`（−368 ms，占总降幅 61%）和 `lib.es5`**——注释/空白占比高的文件；`typescript.d.ts` 只有 −15.7%（注释少、长类型多），瓶颈在建造层与 ASI 回扫（P15/P12）。
- 小文件（10–40 KB）的百分比很大（−41~−63%），但绝对量只有 5–8 ms，且小文件样本 spread 可达 x1.2，**百分比不要单独引用**。
- 批次 2 里 A 与 B 几乎持平（1723.6 vs 1713.9），而 C 只比它们好 ~11%（1525.7）。这就是「次可加」的直接证据：两者省的是同一段每字符税。
- 上表是**分进程、同批次**读数；**独立复验**（同进程 A/B 交替取中位，§5.5）给出并列的第二套口径：逐文件收益排序一致，但 `typescript.d.ts` 只有 **−7.0%**（不是 −15.7%）——该文件是唯一收益不稳的一份，引用时以 §5.5 为准。

### 5.3 等价证据（为什么敢合）

| 证据 | A | B | C |
| --- | --- | --- | --- |
| token 树逐节点摘要（`构造器名[Start,End]` + `Tmp`） | 8/8 identical | — | **8/8 identical** |
| XML 产出 | — | — | **8/8 逐字节相同** |
| 7 项门禁 | 全绿 | 全绿 | **逐项不变**（6167 / 0-0-0 / 1715-1705-0-0-10 / 1719-0 / 226-226 / tsc 0 / xl_check 0 error） |
| basic-tokens 改动 | 0 | 0 | **0** |

摘要长度 `lib.dom` 为 3,771,589 字符，覆盖 `SourceRange`、`Pos`、block 文本、`Data` 顺序与父子关系；XML 比对覆盖错误/范围/注释边界。**这是「时间变了、产物没变」的硬证据，不是抽样。**

### 5.4 口径对照：Lead 自报 vs 本会话复跑

| 组 | Lead 口径（8 份合计） | Δ | 本会话复跑 | Δ | 差异来源 |
| --- | --- | ---: | --- | ---: | --- |
| A | 1982.5 → 1556.2 | **−21.5%** | 1723.6（对 2058–2126 基线） | **−16~−17%** | 跨批次热状态；A 在 `typescript.d.ts` 上 ~0 收益，基线批次的该文件恰好偏快/偏慢 |
| B | 2082.2 → 1666.6 | **−20.0%** | 1713.9（同上） | **−17~−19%** | 同上 |
| C | 2065.5 → 1450.2 | **−29.8%** | 1452.3 / 1517.9 / 1525.7 / 1578.6 | **−25.7% ~ −29.4%** | 交替 2 轮：1517.9 vs 2071.8（−26.7%）、1578.6 vs 2125.5（−25.7%） |

**结论**：三组的方向与量级都被独立复现，但**具体百分点有 ±5% 的口径误差**。对外引用建议写区间：「注释快速路径 −16~−22%、驱动层 −17~−20%、组合 **−26% ± 1.5**（−25.5~−27.6）」，并注明「8 份合计，同机、交替取中位，跨批次 ±5%」。四个 C 读数里最快的一次（1452.3）与 Lead 的 1450.2 几乎重合，说明 −29.8% 是**噪声带的上沿**而不是中心；独立复验（§5.5）测得 −26.3% / −27.5%（跨进程中位 −25.5%），把中心压回 **−26% ± 1.5**。两者不矛盾：**写对外口径用后者，写可达上沿用前者。**

### 5.5 独立复验（`dts-verify`，自建克隆、自跑）

复验方在 `dts-proto-combined @ 2284b883` 的**自建克隆**上从零构建、自跑，不引用本报告任何计时或结论。三套口径如下（8 份最大 `.d.ts`）。

**① 同进程 A/B（warmup + 5 轮交替，取中位）**

| 轮 | 基线 ms | 组合 ms | Δ | 倍数 |
| --- | ---: | ---: | ---: | ---: |
| R1 | 2066.57 | 1522.47 | **−26.33%** | x1.357 |
| R2 | 2004.19 | 1452.11 | **−27.55%** | x1.380 |

**② 跨进程整目录替换（基线 build 与组合 build 各自整目录换入，各跑 2 次）**

| 基线 ms | 组合 ms | Δ |
| ---: | ---: | ---: |
| 1965.7 / 2073.4 | 1532.7 / 1478.0 | **−22.0% ~ −28.7%，中位 −25.5%（x1.341）** |

**③ 逐文件（R2）+ 机制量化（对组合版打点，跳过字符占比）**

| 文件 | Δ（R2） | 跳过字符占比 | 读法 |
| --- | ---: | ---: | --- |
| lib.dom.d.ts | −33.1% | **66.2%** | 注释/空白占比最高，绝对量主体 |
| lib.webworker.d.ts | −28.2% | 59.9% | — |
| typescript.d.ts | **−7.0%** | **24.6%** | 唯一低于两位数；瓶颈不在注释 |
| lib.es5.d.ts | −37.0% | **71.3%** | 跳过占比最高，收益也最高 |
| lib.es2023.array.d.ts | −44.4% | — | 小文件，百分比不要单独引用 |
| lib.es2020.bigint.d.ts | −46.1% | — | 同上 |
| lib.es2015.core.d.ts | −35.7% | — | 同上 |
| lib.es2020.intl.d.ts | −35.4% | — | 同上 |

> 跳过字符占比与逐文件收益**同序**（lib.es5 71.3% > lib.dom 66.2% > webworker 59.9% ≫ typescript.d.ts 24.6%）。这是「收益来自跳过注释/空白」的**机制级证据**：收益大小由可跳过字符占比决定，不是巧合。

**口径结论**

- 对外写 **−26% ± 1.5**（8 份合计，同机，warmup + 5 轮交替中位）。
- §5.4 的 **−25.7% ~ −29.4%（中心 −26.5%）方向正确**；作者会话的 **−29.8% 是噪声带上沿**，不能当中心值引用。
- 独立复验 **−26.3% / −27.5%（同进程）、−25.5%（跨进程中位）**，与上述区间一致，取 **−26% ± 1.5**。
- `typescript.d.ts` 的收益只有个位数：**任何「组合对所有文件都 −25%」的说法都不成立**；`lib.dom` 仍是绝对量主体，`lib.es5` 是百分比最高的大文件。

---

## 6. 路线图（分阶段，含预期终点与批准边界）

基线：226 份 **3356 ms** / 8 份 **2058–2065 ms**。下面每个阶段的终点都写「相对 226 份」的推算，并给出误差带。

### 阶段 1（可立即采用，无需批准 core 语义改动）：合并组合原型

| 项 | 内容 |
| --- | --- |
| 动作 | 把 `dts-proto-combined`（`2284b883`）的 5 个文件合入主仓；`PreAdvance` 保持默认 `-1`（no-op），快路径只在 `TypeScriptTemplate` 生效 |
| 预期终点 | 8 份 **1450–1580 ms（−25.7~−29.8%）**，独立复验跨进程 **1478–1533 ms** 落在区间内；226 份按同比例推 **2400–2490 ms（−26~−29%）**，乐观 **2350 ms** |
| 改动面 | 5 文件 +264/−3，0 basic-tokens，0 `.xl.md` 语义改动（只有 core 三个扩展点 + 一个 TS 覆写） |
| 风险 | 低-中：注释边界（CRLF / U+2028/29 / lone CR / 未闭合 / `\u{...}`）与 `Reload` 交互；A 已用 8/8 摘要双口径背书 |
| 门禁要求 | 7 项门禁逐项不变 + token 树 8/8 + XML 8/8；合并后**重跑一次**（不能只引用原型分支的结论） |
| 决策点 | 是否合并；是否同时把 `tests/bench/dts-profile.mjs`、`prof-summary.mjs` 入库（本轮已拷入，见附录） |

### 阶段 2（低风险、不需要动 basic-tokens）：typescript 层收尾

| 项 | 内容 |
| --- | --- |
| 动作 | `P05`（`Pre` 去 `GetCount`）、`P07(1)(2)`（索引循环 + 单出口，**不含** try/catch 上提）、`P15`+`P21`（`ItemStart` 缓存 / ASI 回扫去重）、`P11`（`Close` 单遍）、`P18`（4 处 `Add` 返回值）；`P09`/`P10` 若愿意连带做 |
| 预期终点 | 再 **−4~7%** → 8 份 **1370–1500 ms**，226 份 **2250–2380 ms** |
| 改动面 | `unit-token.xl.md`、`source.xl.md`、`source-file-end-possible-shape.xl.md`、`item-util.xl.md`、`source-file-shape.xl.md`、4 个 basic-token 各一行 |
| 风险 | 低（P15 的 `ItemStart` 语义要与「建形状的时机」严格同步） |
| 门禁要求 | 同阶段 1；`typescript.d.ts` 单文件必须有可测量的下降（P15 的靶子） |
| 决策点 | 是否把 P07(3)（try/catch 上提）单独作为阶段 3 的前置——它行为可见，建议单独立项 |

### 阶段 3（**需批准 core**）：把每字符税再砍一刀

| 项 | 内容 | 预期 | 风险 |
| --- | --- | ---: | --- |
| **3a** `Source` 值化 | `{Document,Index}` 的两个字段改成传参/内联结构，`At/Pre/EOF` 不再 `new`；**不是**复用实例 | **−15~25%** | 中：牵动所有 `Source` 使用者与 `SourceRange`（不可池化，只能值化） |
| **3b** `UnitToken.Process` 瘦身 | try/catch 上提 + 三字段合并成 `Kind` 判别 + `LastSource` 懒写（= P07(3) + 字段整形） | **−10~18%** | 中高：异常构造点变了，范围/`^` 指示必须逐条对齐 | 
| **3c** basic-token 字符级预分派 | 一次 `charCodeAt` 查表决定进哪个 `Transit`（P13+P04+P14 的组合），10 问 → 2~3 问 | **−10~15%** | **高**：要证明「认领者逐字符不变」 | 

- 终点：**1200–1500 ms（226 份）**，即画像 §8.1 的区间；但 C 已经吃掉了一部分税，**实际要在 C 的 1450ms 基准上重估**，留 **±10%** 误差，别把 8.1 的区间直接叠乘。
- 批准边界：3a 单个就能落地（值化是纯数据结构）；3b/3c **都是 basic-tokens 语义改动，需用户发起**，且必须一条一条上、每条单独跑 7 门禁。
- 顺序建议：3a →（P07(3)）→ 3c 的前置 P13 穷举等价性单测 → 3c。**不要**先做 3c：它是收益最大也最容易静默出错的一项。

### 阶段 4（架构级，可选，重写级投入）

一次字符扫描 + 直接建树：把「`Document.At` → `Source` → `ProcessSource` → `UnitToken.Process` → `Transit` 链」压成「按字符类推进的单一状态机 + 直接产出 shape 节点」。这是 TS 的形态（394 ms / 226 份）。收益上限是把 1200–1500 ms 再压到 **500–800 ms**，但改动面覆盖 core 的 token 骨架、全部 basic-tokens、typescript 的 shape 构建；**风险与工期都是阶段 3 的数倍**，应作为独立项目评估，不进本轮路线。

### 阶段总览

| 阶段 | 现在 → 之后（226 份） | 累计降幅 | 需批准 |
| --- | --- | ---: | --- |
| 0 现状 | 3356 ms | — | — |
| 1 组合原型 | 3356 → **2350–2490 ms** | −26~−30% | 否（合并即可） |
| 2 typescript 收尾 | → **2250–2380 ms** | −29~−33% | 否 |
| 3 core 三件套 | → **1200–1500 ms** | −55~−64% | **是**（3b/3c 属 basic-tokens） |
| 4 架构重写 | → 500–800 ms | −76~−85% | 是（独立立项） |

## 7. 风险与不变量（合并任何一条的前置条件）

### 7.1 七项门禁必须逐项不变

| # | 期望输出 | 说明 |
| ---: | --- | --- |
| 1 | `6167` | 断言/用例计数 |
| 2 | `0-0-0` | 失败-跳过-错误三元组全 0 |
| 3 | `1715-1705-0-0-10` | 分项计数（含 10 个已知例外） |
| 4 | `1719-0` | — |
| 5 | `226-226` | 226 份 d.ts 全覆盖 |
| 6 | tsc **0** error | 生成代码编译干净 |
| 7 | `xl_check` **0** error | `.xl.md` 结构检查干净 |

本轮只核对「**一项都没变**」，不重新解释各项含义。（`tests/gates/run.mjs` 里并行跑的是 **8 道门**；此处的「七项」指最终比对的 7 个固定读数，两者不是同一层。）任何一条改动只要让其中一项变了，就必须回退或解释到「与基线逐字相同」为止。

### 7.2 产物等价（比时间更重要）

- **token 树**：逐节点 `构造器名[Start,End]` + 每个 `Tmp` 文本，`lib.dom` 摘要长 3,771,589 字符；C 为 **8/8 identical**。
- **XML 产出**：8/8 **逐字节相同**（覆盖错误恢复、注释边界、范围）。
- **双口径**：既比摘要也比 XML，两个口径都 8/8 才算过；单口径不算。
- **范围**：8/8 只对**本轮语料**成立（8 份最大 `.d.ts`、226 份 d.ts、复验的 1830 份）。「与逐字符路径逐字节一致」**不是全域命题**：唯一已知例外是 §7.5 的 `/*/`。
- **AST 投影**：不在 `Parse` 路径内，但门禁覆盖，不得因性能改动而变。

### 7.3 语义边界（改动最容易在这里翻车）

| 边界 | 规则 |
| --- | --- |
| CRLF | 行注释/空白跳读按 `\r` 先断，`\r\n` 不能被合并成一个字符（`template.xl.md` 的 `LineTerminatorChars` 已约定） |
| U+2028 / U+2029 | 是行终止符，跳读必须把它们当注释结束，不能当普通字符 |
| lone CR | 单独 `\r` 也是行终止符 |
| 未闭合 `/*` | 必须**落回逐字符**路径（EOF 边界），不能整段吞掉后报错位置偏移 |
| `\u{...}` | `Common.IsInUnicodeBraceEscape` 会让 `{`/`}`/十六进制位让位给符号类；P04/P13 的分派表必须把这类字符留在 `other` 桶 |
| shebang / BOM | 只在文件头有意义；预分派后按位置短路，位置判定不得用「已跳过的字符数」以外的口径 |
| `Reload` 重放 | 队列的 LIFO 队首语义不可动：`ReloadMessage` 插队首，快路径必须让重放仍从队首消费 |
| 异常位置 | `SyntaxException.FromInner` 用 `source.Pre()` 补范围，`^` 指示的列号就是门禁的一部分；P07(3) 是唯一会移动异常构造点的改动，必须单独验证 |
| `/*/` 后另有 `*/` | **唯一已知的树差异**：基线按物理前一字符判 `*/`，会把 `/*/` 的注释提前结束（甚至抛异常）；组合按 TS 词法整段吃掉。方向是组合更正确，**不对齐基线**，详见 §7.5 |

### 7.4 `Source` 的边界（一个容易误读的点）

**不可池化**：`SourceRange.Start/End` 长期持有 `Source` 引用（`source-range.xl.md:21-27`），复用同一个实例会让所有已签出的范围串味——这条是硬约束，任何「对象池」提案直接否。

**但可以值化**：把 `{Document, Index}` 从堆对象改成传参/内联记录（或只在短生命周期路径上内联），减少 `At` 的调用与分配。阶段 3a 指的是这个，不是池化。

### 7.5 已知边界例外：`/*/` 之后同文件再出现 `*/`

这是「组合与基线逐字节一致」的**唯一已知例外**，必须先记账再合并。复验方在 **1875 份语料 + 226 份 d.ts + 6167 个用例**中 **0 命中**，不影响门禁；但「逐字符路径逐字节一致」这句话在文档里不能写成全域命题。

| 输入 | 基线 | 组合 |
| --- | --- | --- |
| `/*/ x */` | **抛「不支持的表达式起点」**（崩） | 正常解析 |
| `var a=1;/*/b*/var b=2;` | 开头 `*` 被当成闭合星 → `ExpressionStatement(BinaryExpression …)` | 注释整段被吃掉 → 两个 `VariableStatement` |
| `/*/usr/local*/let a=1;` | `ExpressionStatement`（`usr / local` 除法链） | `let a=1` |
| `/*/ …`（后文无 `*/`） | 与组合一致 | 与基线一致 |

**根因**：基线 `AreaAnnotation.ExitOrPre` 用**物理前一个字符**判断 `*/`，于是 `/*/` 在注释正文第一个字符处就被误判为注释结束；组合改用 `indexOf('*/', start+2)`，看不到 `start+1` 那颗星，于是按 TS 词法把注释整段吃掉。

**判断**：方向是**组合更符合 ECMAScript/TS 词法**，基线在这里自相矛盾（同一形态下有时崩、有时把 `*` 当乘号），所以**不建议为对齐基线而改**。若某天必须与基线逐字节对齐，可在 `PreAdvanceArea` 里补一条立即闭合分支（`content[start.Index+1]==='*' && content[index]==='/'`）——但那是在复制一个 bug，需要单独批准并单独立项。

---

## 8. 环境债与复跑

### 8.1 已知环境债（与性能改动无关，建议单独立项）

| 项 | 现象 | 影响 | 建议 |
| --- | --- | --- | --- |
| `tests/gates/run.mjs` 在本仓**结构性跑不动** | 本轮实跑：8 道门并行，`runtime:check` 0.8 s 内 `MODULE_NOT_FOUND`（`tests/runtime/check.mjs:68`）；另有依赖历史上不存在的 `print-ast-common.js`、缺 `tsrun` 的路径 | 门禁读数无法在干净克隆里一键复跑；本轮的门禁结论来自原型分支的工作副本与历史读数 | 修门禁脚本（补依赖/改路径）应**单独立项**，不要混进性能 diff |
| `dist` 有 **3 个孤儿产物** | 源 `.xl.md` 已删，`dist` 里对应产物还在 | `xl_check` 会报 E2004；不影响力，但会让「干净」失真 | 用 `xl_orphans prune` 或手工删，单独一次提交 |
| 原型分支的 `build/` 是人工构建的 | 三个分支的 `build/ts` 各自编译，未走 CI | 跨分支数字只在各自 `build` 内有效 | 合并时以主仓 `pnpm build` 重新构建后再测一次 |

### 8.2 复跑命令（克隆根目录，`node_modules`/`build`/`dist` 已镜像）

```powershell
# 0) 构建：xl 不在 PATH，用会话工具 xl_build（cwd=仓库根，targets=['ts']，paths=['core','typescript','tests'...]）生成 build/ts；
#    再 pnpm compile 跑 tsc。不要直接 pnpm build（它调 xl build，在 PATH 外失败）
pnpm compile

# 1) 端到端：8 份 / 226 份
node tests/bench/parse-perf.mjs --dts 8 --repeat 3
node tests/bench/dts-profile.mjs --corpus --json > tmp/corpus.json
node tests/bench/dts-profile.mjs --file node_modules/typescript/lib/lib.dom.d.ts --repeat 3
node tests/bench/dts-profile.mjs --ts --repeat 1
node tests/bench/dts-profile.mjs --scale 1,2,4,8

# 2) 每字符计数 / 单次成本（只报次数，不报耗时）
node tests/bench/dts-cost-probe.mjs --count --files 1
node tests/bench/dts-cost-probe.mjs --micro

# 3) 同进程 A/B（基线 vs 实验交替；比分进程相减可信）
node tests/bench/dts-ab.mjs

# 4) 门禁（本仓当前跑不动，见 8.1；在能跑的工作副本里执行）
node tests/gates/run.mjs

# 5) profile（会 +46% 耗时，只用于归因）
node --cpu-prof --cpu-prof-dir=tmp/prof --cpu-prof-interval=100 tests/bench/dts-profile.mjs --corpus --top 5
node tmp/prof-summary.mjs tmp/prof/*.cpuprofile --top 30
```

**A/B 的正确做法**：想证明「某改动有效」，必须在**同一个进程里交替**跑基线/实验（`dts-ab.mjs` 的做法：把 `build/ts` 复制成 `build/ts-exp` 打补丁，交替 5 轮取中位）；分进程、分批次相减只能得到区间（§2.2）。本报告的 §5.2 是「分进程、同批次」，所以给了区间而不是单点。

---

## 9. 附录

### 9.1 分支与 SHA

| 分支 | SHA | 用途 | 产出 |
| --- | --- | --- | --- |
| `dts-profile` | `6de1ef50` | 画像：226 份端到端 + CPU profile + 每字符计数 | `docs/dts-perf-profile.md`、`tests/bench/dts-profile.mjs`、`tests/bench/prof-summary.mjs` |
| `dts-survey` | `180afc3c` | 优化清单：P01–P23、Top5 路线、不建议 10 条、5 个假设 | `docs/dts-optimization-ideas.md`、`tests/bench/dts-cost-probe.mjs`、`tests/bench/dts-ab.mjs` |
| `dts-proto-comment` | `b7a50d35` | 原型 A：注释/空白整段快速路径 | 5 文件 +231/−1 |
| `dts-proto-drive` | `be9661f6` | 原型 B：驱动层去税 | 1 文件 +33/−2 |
| `dts-proto-combined` | `2284b883` | 原型 C：A+B 合并 | 5 文件 +264/−3 |
| `dts-report` | 本报告所在分支 | 总报告 + 索引 + bench 脚本拷贝 | `docs/dts-optimization.md`、`docs/Final.md`、`tests/bench/dts-profile.mjs`、`tests/bench/prof-summary.mjs` |
| `dts-verify` | 基于 `dts-proto-combined @ 2284b883` 的自建克隆 | 独立复验：同进程 A/B、跨进程整目录替换、逐文件、1830 份语料等价 | 读数见 §5.5，证据见 §9.4 |

> 全部基于主仓 `ffc0515a`（`feature/quick-parse`）；**均未合主仓、未 push**。

### 9.2 各分支文件清单与用途

**A `dts-proto-comment`（b7a50d35）**

| 文件 | 行数 | 用途 |
| --- | ---: | --- |
| `core/syntax/document.xl.md` | +8 | 可选原文访问口（`GetRaw`/`Content` 的空实现），默认不启用 |
| `core/syntax/syntax-context.xl.md` | +13 | 每字符前问 `Template.PreAdvance`，命中则整段跳过（默认 `-1` = 不跳） |
| `core/syntax/templates/template.xl.md` | +19 | `PreAdvance` 默认实现（no-op），保持所有语言模板行为不变 |
| `typescript/run/text-document.xl.md` | +1 | 把 `Content` 暴露给 core 的可选接口 |
| `typescript/run/typescript-template.xl.md` | +191 | DTS 专用：`/* */`、`//`、空白 run 的边界识别与 `Tmp` 切片 |

**B `dts-proto-drive`（be9661f6）**

| 文件 | 行数 | 用途 |
| --- | ---: | --- |
| `core/syntax/syntax-context.xl.md` | +33/−2 | `ProcessSingle`/`ProcessAt` 队列空快路径；`DrainMessages` 早返回；`DrainQueue` 与 `Reload` 语义保留 |

**C `dts-proto-combined`（2284b883）** = A ∪ B，冲突只在 `syntax-context.xl.md`，由 ort 自动合并且逐条核对（先跳读、再队列快路径）。

**本报告分支新增**

| 文件 | 用途 |
| --- | --- |
| `docs/dts-optimization.md` | 本文件（面向决策的总报告） |
| `docs/Final.md` | §8 索引新增本报告；§2 后补一句性能现状指引（不动既有门禁数字） |
| `tests/bench/dts-profile.mjs` | 拷自 `dts-profile` 分支，**内容未改**，供复跑 226 份/TS 对照/规模曲线 |
| `tests/bench/prof-summary.mjs` | 拷自 `dts-profile` 分支，**内容未改**，供 `--cpu-prof` 汇总 |

### 9.3 一句话给决策者

> 这 3.4 s 不是「某个算法慢」，而是 **core 的每字符固定税**（3.07 次分配 + 6.15 次读取 + 1 个队列项 + 3.44 次 `Process`），且与输入严格线性（β≈1），所以缓存无效。**组合原型已经把 8 份从 2065 ms 压到 1450–1520 ms（对外口径 −26% ± 1.5，可达上沿 −30%；产物 8/8 等价、门禁逐项不变、0 basic-tokens 改动；唯一已知边界例外见 §7.5）**，可以立即合并；再往下必须动 core 的两件事（`Source` 值化、`Process` 瘦身/字符预分派），**这需要你批准，且建议一条一条上、每条单独跑门禁**。

### 9.4 独立复验的范围与证据（PASS）

复验方在自建克隆上从零构建、自跑，结论 **PASS**，证据如下：

| 项 | 结果 |
| --- | --- |
| 整棵编译树 | **876 个文件，仅 5 个 `.js` 不同**：`document` / `syntax-context` / `template` / `text-document` / `typescript-template`——正好是 A∪B 触及的 5 个源文件，**没有第 6 个文件被顺带改变** |
| `core/syntax/basic-tokens/**` | 编译产物 **0 差异**，与 §5.1「0 basic-tokens 改动」互证 |
| token 树摘要 + XML sha256 | **8/8 identical**；`lib.dom` **109,605 个节点**、`lib.es5` **10,297 个节点** |
| 扩展语料 | 另跑 **1830 份**（token 用例 + lib d.ts + typescript/cases）→ **0 树差** |
| `Template.PreAdvance` | 默认返回当前 index（等价 no-op），覆写只存在于 TS 模板 |
| `Document.RawText` | 默认 `""`，可选原文访问口不启用 |
| `UnitToken.Process` | try/catch 结构与异常范围口径**未动** |
| `DrainQueue` / `Reload` | 队首与重放语义保留 |
| `ProcessSource` 生命周期 | 无悬空引用 |

> 与 §5.3 的 8/8 是**两条互不相干的验证路径得出的同一结论**（本报告比摘要 + XML；复验方比节点数 + sha256，并把语料扩到 1830 份）。唯一的例外形态见 §7.5。


