# 性能优化空间分析（2026-10-23，HEAD `opt/tokens-opt-integrated` @ `7f130ba7`）

> 本轮是**只读分析 + 实验副本验证**：没有改任何 `*.xl.md` 源码/测试/期望值。
> 实验产物只落在 gitignored 的 `build-exp*/` 与 `tmp/perf-next/`。
> 结论按「有没有量 → 有多大 → 值不值得做」组织；每个数字都带口径（实测 / 同场 A/B / profile / 估算）。
> 过程材料：`tmp/perf-next/tokens-startup.md`（tokens/XML/启动）、`tmp/perf-next/core-candidates.md`（core/syntax 候选）、
> `tmp/perf-next/xml-prototype.md`（XML 原型）、`tmp/prof/*.cpuprofile`（本轮 profile）。

---

## TL;DR

1. **解析主路径（`SourceFileRunner.Parse`）已经见底。** 在 HEAD 上重测 + 做原型：
   低风险候选合计只有 **≈3%**（CatalogGuide 位掩码 1.2–1.5% + 行号表惰性 1.6–1.8%，同场 A/B 实测合计 **+3.01%**），
   其余单项全部 <1%，**没有任何 10% 级的 parse 热点**。tokens 层确认封盘（无 >0.3%/pass 的单项候选）。
2. **真正有量的是两条既有性能读数没覆盖的轴**（`parse-perf`/`buffer-ab` 都只计 `Parse`），但**只有一条在 AST 流程里**：
   - **启动装载（在 AST 流程里）**：进程内首次 `require` **≈191 ms / 327 模块**（7 轮中位；区间 171–218）；
     单文件 CLI 的 ~87%、8 份 d.ts 一次性进程的 ~25%。成本是 **CJS 模块机器税**（stat/read/compile），
     不是模板初始化（`Template.Create()` 实测 0.004 ms）。
     **已验证可去掉多少**：单文件打包代理（327→1）装载 **191.0 → 33.7 ms/进程，净 −157 ms（−82%）**；
     新进程「装载+解析 8 份 d.ts」外壁钟 **1329.5 → 1167.3 ms（−12.2%）**。`NODE_COMPILE_CACHE` 实测**无显著收益**。
   - **XML 序列化（不在 AST 流程里，见 §1.4）**：8 份 d.ts 上 XML = **65.6 ms = parse 的 13.1%**；rope + 标签串缓存原型实测
     **XML −59.2%、写出口径 −43.0%**，全语料逐字节等价 PASS。但它的消费方是**等价门禁 + `samples` + cjcli 的 XML 输出**
     （cjcli 在 HEAD 还构建不起来），**不参与 AST 解析/投影**。→ 收益是「门禁/CI 变快 + XML 输出面变快」，不是 AST 管线延迟。
3. **建议**：若目标是「AST 管线延迟」→ 先做**启动打包**（唯一 >10% 的单点），parse 侧只有实测 **+3.01%** 与几个 <2% 的小项；
   XML rope 是否做，取决于**是否把 cjcli 的 XML 输出当交付面**（以及门禁时间是否需要压缩），不能记在 AST 流程账上。
   AST 投影本身（shape→AST）目前**没有产品入口**、也未进入任何门禁计时，若它将成为产品输出，应先立它自己的度量。

---

## 0. 口径与环境

| 项 | 值 |
|---|---|
| 分支 / HEAD | `opt/tokens-opt-integrated` @ `7f130ba7`（工作树干净） |
| 构建 | 本轮已刷新：`xl_build(core,typescript→ts)` 0 error，`tsc` 0 error，`build/ts` 872 个 js |
| 机器 | Intel Xeon Platinum 8378C @ 2.80 GHz（4C/8T）/ Windows 10 x64 / Node **v24.21.0** |
| 语料 | `node_modules/typescript/lib` 最大 8 份 `*.d.ts`（4,056,233 B / 4.06 M 字符），与既有 bench 同口径 |
| 计时 | `parse-perf --dts 8 --repeat 5`（跨进程，3 次中位）；同场 A/B 用 `buffer-ab --repeat 15/21`（同进程、逐轮换序） |
| profile | `node --cpu-prof --cpu-prof-interval=100`，有效采样 ≈0.9–1 ms（<0.7% 不可信，>1% 排序稳） |
| 换算 | 本会话 **1% ≈ 4.94 ms/pass**（parse 基线 515.8 ms） |

**基线噪声**：`parse-perf --dts 8 --repeat 5` 三次 TOTAL 中位 **515.8 / 525.6 / 514.2 ms**（±1.1%）。
历史 A/A 地板 +0.7%～+2.2%（`docs/opt-basic-token-source-range.md` §3.1）；单轮波动可达 ±2–4pp。
**任何 <2% 的 parse 侧改动，只有 A/B `--repeat 21` + 同会话 A/A 且双口径同向才可采信。**

---

## 1. 基线读数

### 1.1 parse（8 份 d.ts，干净基线）

| 文件 | 字符 | parse 中位 ms |
|---|---:|---:|
| lib.dom.d.ts | 2,349,323 | 275.8 |
| lib.webworker.d.ts | 787,040 | 102.7 |
| typescript.d.ts | 588,452 | 98.3 |
| lib.es5.d.ts | 218,972 | 27.9 |
| lib.es2023.array.d.ts | 40,197 | 3.0 |
| lib.es2020.bigint.d.ts | 38,258 | 3.9 |
| lib.es2015.core.d.ts | 22,824 | 2.3 |
| lib.es2015.symbol.wellknown.d.ts | 10,971 | 1.9 |
| **TOTAL** | **4,056,233** | **515.8** |

### 1.2 XML 输出（**不在 AST 流程**；门禁/XML 输出面，8 份 d.ts，同进程交替 11 轮中位）

- XML **65.57 ms**，**XML/parse = 13.1%**（逐文件 8.0%–18.4%）。
- 写出口径（`ToString` + `Buffer.from`）= **73.56 ms**。
- 单文件锚点（Lead 独立实测）：lib.dom 293.7/30.7 ms（10.5%）、lib.webworker 103.9/14.5（14.0%）、
  typescript.d.ts 99.8/13.3（13.3%）、lib.es5 22.6/2.8（12.5%）。
- **口径提醒**：`parse-perf` / `buffer-ab` 都不测 XML；`buffer-equivalence` 的「XML 序列化 755.2 ms」是
  4,556 文件两侧合计且含 `Buffer.from`+`firstDiff`，**不能当纯 XML 成本**。
- **它不属于 AST 流程**，消费方见 §1.4。

### 1.3 启动装载

| 量 | 值 |
|---|---:|
| 进程内首次 `require`（入口 `source-file-runner.js`） | **191 ms**（7 轮中位；不同 probe 实测 171–218） |
| 静态 require 图 | **327 模块**（`build/ts` 共 872 js，545 个不在图里） |
| 编译后体积 | 1,524,541 B（均 4.65 KB/模块） |
| 相对大小 | 8 份 d.ts 一次性进程：**≈25%**（load/(parse+load)，该口径 parse 538.9 ms）；226 份语料：**≈15%**；单份 lib.es5：**≈87%** |
| `Template.Create()` | **0.004 ms/次**（所以「模板装载太重」是错的） |

启动分解（`load-only.cpuprofile`，总计 ≈250 ms 含 profiler）：
`wrapSafe` 25.6%（编译）· `internalModuleStat` 18.1%（stat）· `readFileUtf8` 9.0% · `lstat`+`realpathSync` 10.7% ·
loader 其余 ~30% · **模块 JS 执行 <1%**。→ 成本 **按模块数线性**，≈0.55 ms/模块。

**验证（2026-10-23 补，不实装）：单文件打包代理**

方法：按静态 `require` 图把入口闭包（**327/327 模块**，与 `require.cache` 数一致）合成一个文件，
运行时只做「读 1.6 MB 文件 + 一次 `new Function` 编译 + 一次执行（含全部模块体）」——这正是打包省掉/保留的负载；
构建期合并不计时。脚本 `tmp/perf-next/startup-bundle-probe.mjs`，每侧 7 个新进程：

| 口径 | 327 模块 `require` | 单文件打包代理 | 结论 |
|---|---:|---:|---|
| 装载（进程内 hrtime，7 轮中位） | **191.0 ms** | **33.7 ms** | **净可减 ≈157 ms/进程（−82%）** |
| 新进程「装载+解析 8 份 d.ts」**外壁钟**（5 轮中位） | **1329.5 ms** | **1167.3 ms** | **−162 ms（−12.2%）**，与装载差同量级（内部 load 183.9→32.9，parse 不变） |
| 行为 | — | XML 逐字节相同（`xmlSame: true`） | 代理没有改变解析语义 |

**「直接减去」折算**（一次性进程 = node 启动 + 装载 + parse；只扣装载这一项）：

| 场景 | 现状 | 减去可省装载后 | 降幅 |
|---|---:|---:|---:|
| 8 份 d.ts 一次性进程（parse 515.8） | 706.8 ms | **549.5 ms** | **−22.3%** |
| 226 份语料一次性进程（parse 951.2） | 1142.2 ms | **984.9 ms** | **−13.8%** |
| 单份 lib.es5（parse 27.9） | 218.9 ms | **61.6 ms** | **−71.9%** |

口径与局限：①代理用 `new Function` 而非 esbuild/rollup，真实打包会多一层 loader 与小量胶水；
②打包必须 **keepNames**（`constructor.name` 是 XML 标签名唯一来源）；③代理已包含 1.6 MB 单文件读取与一次全量编译，
所以 33.7 ms 不是「零成本」；④本读数只对**一次性进程**成立，长驻进程/批量任务按比例摊薄
（226 语料 ≈14%、8 份 ≈25%、单份小文件 ≈72–87%）。

### 1.4 流程事实：XML 与 AST 的关系（**修正：XML 不在 AST 流程里**）

AST 流程只有这三步，**没有任何 `ToXmlString`**：

```
源文件 --Parse--> shape 树（SourceFileShape） --投影--> AST（JSON/比较）
                                         └─ 测试尺子：typescript/cases/ast-compare.mjs 的 cjAst（直接遍历 shape.Data）
                                         └─ 第三出口：Token.PrintAst（tests/parse/direct-ast.mjs）
```

- **XML 的唯一消费面**：① 等价门禁 `buffer-equivalence` / `buffer-size-sweep` / `class-scaling` 的 xml 通道
  （最强语义判据：逐字节 + digest）；② `samples/check.mjs` 金样；③ `cjcli` 的 XML 输出——而 `cjcli.xl.md` 仍引用已删除的
  `dawn/**`，**HEAD 上构建不起来**。`docs/Final.md:38` 的「XML token 树」说的是**门禁判据之一**，不是产品输出。
- `typescript/ast/*.xl.md` 的 13 个 `AstNode` 类：当前**没有任何入口 import 它们**（只有彼此互引），属未接线/规划中的层。
- **补充实测（AST 投影本身的量级，作参考）**：用测试尺子 `cjAst` 投影 8 份 d.ts = **77.2 ms**（217,355 节点，
  ≈355 ns/节点），与 XML 的 ~302 ns/节点同量级；该口径下 parse 为 627.5 ms（重复解析抬高），按干净基线折算 ≈**63 ms ≈ parse 的 12%**。
  这只说明「若 AST 输出成为产品，它自己会是一条 ~12% 的轴」，**不是当前 HEAD 的产品成本**。

### 1.5 与 TypeScript 对照：三种口径（2026-10-23 补）

语料 = `perf-vs-ts` 默认 **top8 `.d.ts`（4,629 KB）**，TS **6.0.3**，同机。
**关键：装载只能从「一次性进程」口径里扣，不能从 parse-only 里扣**（parse-only 两边本来都不含装载）。

| 口径 | ours | TypeScript | 倍数 |
|---|---:|---:|---:|
| **A. warm parse-only**（campaign 口径，两边都不含装载；`perf-vs-ts --repeat 5`） | 580.2 ms | ts-np 194.1 / ts-par 233.4 | **2.99× / 2.49×** |
| **B. one-shot 现状**（新进程：装载 + 首次解析，冷 JIT；每侧 7 进程中位） | **197.0 + 959.2 = 1156.2** | **210.7 + 398.5 = 609.2** | **1.90×** |
| **C. one-shot − ours 装载**（打包代理后 load 33.7） | **33.7 + 959.2 = 992.9** | 609.2 | **1.63×** |
| C′. C 再叠加已实测 parse +3.01% | ≈963 | 609.2 | ≈**1.58×** |
| 参考：两边都去装载（不公平极限） | 959.2 | 398.5 | 2.41× |

- **不要用** `580.2 − 157.3 = 422.9 / 194.1 = 2.18×` 这种算法：parse-only 不含装载，减了就是重复扣；
  同理也不能把「减去装载后的 ours」去比「TS 的 parse-only」。
- 两个口径的差异来源：one-shot 里 **JIT 是冷的**（ours 冷 959.2 vs 热 580.2；TS 冷 398.5 vs 热 194.1），
  ours 的冷启动惩罚绝对量更大；装载方面两边原本几乎一样（197.0 vs 210.7），
  打包后 ours 的装载优势才显出来（33.7 vs 210.7）。
- 读数脚本：`tests/bench/perf-vs-ts.mjs`（A）、`tmp/perf-next/oneshot-probe.mjs`（B/C）。


---

## 2. parse CPU 归因（profile，8 份 d.ts，`next-dts8.cpuprofile`）

采样 4,283 ms / 6 个 pass；GC self **7.4%**。模块聚合（self）：
**core/syntax 45.1%** · **typescript/tokens 28.7%** · **core/basic-tokens 10.2%** · GC 7.4% ·
node-internals 3.1%（≈模块装载，一次性）· native 2.7% · typescript/run 2.2%。

| # | 函数（文件） | self% | 折算 ms/pass* | 说明 |
|---:|---|---:|---:|---|
| 1 | `Transit`（templates/basic-dispatch） | 8.16 | 42.1 | 逐字符主分派（含被内联的 Last/ValueAt） |
| 2 | `BlockToken` ctor | 6.18 | 31.9 | 构造（含被内联的 Token 字段初始化） |
| 3 | `UnitToken.Process` | 4.94 | 25.5 | 逐窗口/逐字符驱动帧 |
| 4 | `Token` 字段初始化 | 4.76 | 24.6 | `Data[]` + `new SourceRange()` + 11 个字段 |
| 5 | `UnitToken` ctor | 4.72 | 24.3 | 构造 |
| 6 | `CatalogGuide.ComputePossibleShapesByIndex` | 3.99 | 20.6 | 候选集合迭代（均值仅 3.59 个候选） |
| 7 | `WrapSymbol.Transit` | 3.17 | 16.4 | 空白段 |
| 8 | `BatchPlain` | 2.20 | 11.3 | 标识符/数字段批扫 |
| 9 | `Symbol.Transit` | 1.81 | 9.3 | 符号合并 |
| 10 | `ParseTypeMember`（type-builder） | 1.81 | 9.3 | tokens 形状解析 |
| 11 | `ParsePrimaryType` | 1.75 | 9.0 | 同上 |
| 12 | `CatalogGuide.ComputePossibleShapes` | 1.63 | 8.4 | thin wrapper（可内联） |
| 13 | `ProcessLineStartOffsets`（text-document） | 1.50 | 7.7 | **HEAD 上零消费者**的行号表（异常消息走 `GetRangeLines`，不读它；见 §3.2） |
| 14 | `TypeBuilder.LoadFrom` | 1.46 | 7.5 | tokens |
| 15 | `PropertySignaturePossibleShape.Scan` | 1.31 | 6.8 | tokens |
| 16 | `BlockToken.AppendAndSignOut` | 1.19 | 5.9 | 每次 append 一次 `indexOf("\\")` |
| 17 | `Token` ctor | 1.03 | 5.3 | 构造 |
| 18 | `CatalogGuide.Reset` | 1.03 | 5.3 | 每次 Build 后 clear+N add+`Array.from` |
| 19 | `PropertySignaturePossibleShape.Analyze` | 0.98 | 5.1 | tokens |
| 20 | GC `(garbage collector)` | 7.4 | 38.2 | 主要由每 token 3 个对象驱动（Token/`Data[]`/`SourceRange`） |

\* 折算口径：self% × 干净基线 515.8 ms（不把一次性模块装载算进 per-pass；profile 绝对值含 profiler/装载开销，不能直接当墙钟）。

**一句话**：token 构造族（#2+#4+#5+#17 ≈ 16.5% ≈ 85 ms/pass）+ 分派族（#1+#7+#8+#9 ≈ 15.3%）+ 候选调度族（#6+#12+#18 ≈ 6.7%）
构成 parse 侧的全部大块；tokens 形状解析（#10/#11/#14/#15/#19…）是分散的 1–2% 项，没有单项可抠。

---

## 3. 已用实验副本验证的优化（有 A/B 读数）

所有实验副本都在 gitignored 目录（`build-exp*`），未改源码；等价判据是
`buffer-equivalence --mode both` 的 **xml 逐字节** + **digest token 指纹** 双通道。

### 3.1 XML 序列化 rope + 标签串缓存（**门禁/XML 输出面**，不在 AST 流程；本轮单点收益最大）

**机制（比原假设更准）**：HEAD 的 XML 是**纯标签骨架**——8 份 d.ts 的树 217,363 节点 / 8.59 MB，
**非空 `Temp` 节点 = 0**（basic token 在 Close 时已丢弃）。所以成本不是「子树复制 × 深度」，
而是**每节点 ≈302 ns 的固定工作**：`constructor.name` + 两个标签串的构造 + 每层 `push`+`join`。

| 变体 | 做法 | XML-only | 写出口径（ToString+Buffer.from） | 判定 |
|---|---|---:|---:|---|
| A | 共享 `string[]` + 根 `join` 一次 | −7.9% | −9.4% | **否决**（只去 join 没用） |
| C | rope（返回 ConsString），标签仍现拼 | −41.4% | −25.1% | 边缘 |
| **B** | **rope + 缓存 `<Name>`/`</Name>` 标签串** | **−59.2%**（65.57→26.75 ms） | **−43.0%**（73.56→41.96 ms） | **通过** |

- **收益口径（修正）**：这里省的 31.6 ms 是 **XML 序列化面**的：等价门禁（4,556 文件 XML 逐字节比较）和
  `samples` 金样、以及将来恢复的 cjcli XML 输出。**它不是 AST 管线延迟**——AST 流程（Parse→shape→cjAst/PrintAst）
  根本不调用 `ToXmlString`（§1.4）。若要把它记作「端到端 −5.5%～−6.3%」，必须注明是 **parse+XML 输出**这个组合口径。
- `parse` 本身无回归（`buffer-ab` 508.3→512.2 ms，−0.76%，噪声内；Lead 复测 515.3→508.9，方向相反、同为噪声）。
- **等价**：`buffer-equivalence --mode xml` **PASS 4504 / FAIL 0 / 同错 52**，字节两侧 **34,109,694 一致**；
  8 份文件每轮断言整串相等。
- 落地范围：`core/syntax/token.xl.md`（rope+tag cache，覆盖 95%+ 节点）+ 6 个叶/容器委托文件（`basic-tokens/**`，**用户专属权限**）。
- 风险：①tag cache 以 `constructor` 为 key，**打包/混淆必须 keepNames**（类名即 XML 标签）；
  ②rope 返回 ConsString，flatten 推迟到 `Buffer.from`/写出，所以按 −43% 而非 −59% 计；
  ③core 的「端到端 ≥10%」门槛到不了，建议按 **XML 输出轴**单独验收（逐字节等价 + 写出口径 ≥30% 降幅）。
- 附带结论：`XmlDecode` 快路径对 XML 输出路径 **零收益**（无 Temp 文本可转义）→ 不做。

### 3.2 CatalogGuide 候选集位掩码 + 行号表惰性（parse 侧，已实测 +3.01%）

| 项 | 改动 | 估算贡献 |
|---|---|---:|
| C1 | `Candidates: Set<int>` → 32 位掩码 + `LiveCount`；`Reset` O(1)；去 `Array.from(...)[0]`；wrapper 内联 | **1.2–1.5%** |
| C3 | `TextDocument` 行首偏移表改按需构建（`GetLine*` 才建；**仓内 0 调用**，见下） | **1.6–1.8%**（直接测 TextDocument 构造 5.4 ms/lib.dom） |

**C3 的消费者链（2026-10-23 核实，全仓 grep）**：

```
LineStartOffsets ──读──> TextDocument.GetLine / GetLineInfo / GetLineOffset
                          └──被──> SourceRange.GetStartLine / GetEndLine / GetStartLineInfo / GetEndLineInfo / GetLineRange
                                     └──仓内调用点：0 个（连测试、cjcli.xl.md、samples 都没有）
```

- **异常消息也不消费它**：`SyntaxException` 拼消息走 `sourceRange.GetRangLines()`
  → `Document.GetRangeLines(range)` → `TextDocument.GetRangeLines`，那条路径**自己重扫 `Content` 建行**，
  完全不读 `LineStartOffsets`。所以「行号表是为错误消息建的」这个说法（`typescript/run/text-document.xl.md:17` 的注释）
  **在 HEAD 上不成立**，属过时/不准确注释。
- 结论：行号表目前是**公开 API 预留**（`SourceRange.Get*Line*` 仍是 public），仓内**零消费者**；
  懒建不改变任何仓内行为，唯一风险是仓外（外部语言模板/宿主）有人直接调这些公开方法——懒建同样安全，
  只是把成本推迟到第一次调用；若要**删除**才是公共 API 变更，需单独批准。

- 规模依据（lib.dom）：`ComputePossibleShapesByIndex` 69,267 次/parse，候选迭代 248,558 次（**均值 3.59 个**），
  `Reset` 13,858 次/parse，`CatalogGuide` 实例 2,953 个、`PossibleShapes.length` avg 3.4 / max 13（位掩码 ≤30 安全）。
- **同场 A/B（`buffer-ab --repeat 21 --dts 8`）**：TOTAL **494.187 → 479.319 ms，+3.01%**
  （逐轮合计中位 +2.14%）；`buffer-equivalence --mode both` **xml+digest 全 PASS，字节 34,109,694 两侧一致**。
- 权限：C1 在 `core/syntax`（需批准）；C3 在 `typescript/run`（相邻层，需扩权）。

---

## 4. 已测但**不值得做**（本轮否证 / 降级）

| 候选 | 读数 | 结论 |
|---|---|---|
| `PossibleShape.Slot` 实例缓存（分析初估 0.8–2.0%） | Lead 实测 **113,761 次/8 份 pass（0.028/char）**，按 O5a 单价 9.2–14.7 ns → 上限 **≈1.5 ms/pass（0.3%）** | **降级为不做**（原估算高估了 3–6 倍） |
| `GetRaw`（`Content.substring`）改直接 `charCodeAt` 扫描 | 微基准（lib.dom 真实段起点）：空白段 232,820 个 6.7→5.08 ms、标识符段 260,710 个 26.4→23.7 ms，合计上限 **≈4.3 ms/pass（0.8%）**，GC 收益未测 | **不做**（收益 <1%，改动触核心分派） |
| `NODE_COMPILE_CACHE`（跨进程代码缓存） | 8 轮：baseline wall 287–372 ms；compile-cache 冷跑 848 ms（填充）、热跑 280–315 ms，差异在噪声内 | **测不出**（`wrapSafe` 只占装载 25%，stat/read 仍在） |
| `XmlDecode` 快路径 | XML 输出无非空 Temp 节点（纯标签骨架） | **零收益，不做** |
| token 构造层「减字段/懒建/对象复用」 | 分析确认只有 0.1–0.3% 的局部减法；分配减少换墙钟此前已被 4 次实测否决 | **不做**（构造 16.5% 是表示法结构成本，非可抠项） |
| GC 独立优化 | GC 7.4% 是构造分配的影子成本 | **不单独立项**（只能随结构变化） |
| Transit 首字符预筛 | 已以 class table 落地（O4 + 窗口 128），残余候选实测否决 | **不要重做** |
| tokens 层残余 | `typescript/tokens` 最高频方法仅 0.018/字符；余项全在已否证/已落地族 | **封盘** |
| 构建缓存轴（`dist/ts` 5,217 文件 = 872 ts + 4,345 `.xl` cache/8.8 MB） | 纯构建期，不影响运行时 | 低优先，不做 |

---

## 5. 未原型化的候选（估算，需 A/B hardening）

| # | 候选 | 位置 | 估算 | 风险 |
|---|---|---|---|---|
| C4 | `UnitToken.Process` 帧残余：`buffer.Document.GetValue` 提升、单分支队列快路径、`Token.Last()` 快路径 | `core/syntax/unit-token`、`token` | 0.6–1.2%（3–6 ms/pass） | 低 |
| C5 | `Close` 的 `"ComputePossibleShapes" in parent` → `OnChildClosed`（顺带消 9 处重复） | `core/syntax/basic-tokens/**`（9 个） | 0.3–0.6% | 低–中 |
| C6 | `DrainMessages` 的 `splice(0,1)` → `shift()`/游标 | `core/syntax/syntax-context` | 0.2–0.4% | 很低 |
| C7 | `AppendAndSignOut` 单字符 `indexOf("\\")` 快路径 | `core/syntax/block-token` | 0.1–0.3% | 很低 |
| C9 | Process 挂载链扁平化（trampoline） | `core/syntax/unit-token`、`shape-token` | 0.6–1.6%（上限 ~30 ms） | **高**（推进语义/`no progress` 守卫） |

C4–C7 合计乐观 **1.2–2.5%**，全部 <2%，**必须 A/B `--repeat 21` + 同会话 A/A 双口径同向**才判得动；
C9 收益虽大但语义风险最高，需独立分支 + 推进性专项测试，不建议与本轮同批。

---

## 6. 建议的优先级

| 优先级 | 动作 | 预估收益 | 风险 | 权限 | 验收 |
|---:|---|---|---|---|---|
| **P0** | **启动打包（327→1）**，作为**附加产物**不替换 `build/ts` | **已用打包代理验证：装载 191.0→33.7 ms/进程，净 −157 ms（−82%）**；8 份 d.ts 一次性进程 −22.3%、226 语料 −13.8%、单份 es5 −71.9% | 中–高（keepNames、加载顺序、构建步骤） | 构建/工具链改动（用户批准） | 代理 A/B（`startup-bundle-probe.mjs`，每侧 7 进程）+ 真实打包后重测；`constructor.name` 不变 |
| **P1** | CatalogGuide 位掩码 + 行号表惰性 | parse **+3.01%**（已实测） | 低 | C1 core/syntax；C3 typescript/run | A/B `--repeat 21` + A/A；xml/digest 等价 |
| **P2** | C4/C5（+C6/C7 顺手） | 合计 1.2–2.5%（估算） | 低 | core/syntax + basic-tokens | 逐项 A/B，双口径同向才留 |
| **可选** | **XML rope + 标签串缓存（变体 B）**——**只对门禁/XML 输出面有价值，不在 AST 流程** | XML −59.2%、写出口径 −43%；等价门禁与 cjcli XML 输出变快 | 低（逐字节门禁兜底） | `core/syntax` + `basic-tokens/**`（用户专属） | `buffer-equivalence --mode xml` PASS 4504/0；写出口径 ≥30% 降幅；A/B `xml-ab.mjs` |
| 停 | tokens 层、构造/GC 分配、Transit 预筛、XmlDecode、compile cache、GetRaw 扫描、C2 Slot 缓存 | ≤0.3% 或已否证 | — | — | — |

**门禁口径建议**：`parse-perf`/`buffer-ab` 保留为 **parse-only 回归门禁**；另立「**AST 管线端到端**」度量
（node 启动 + load + parse + shape→AST 投影），否则启动与 AST 投影这两条轴会永远不可见。
XML 若要有收益记录，应单独立「**XML 输出轴**」门禁（逐字节等价 + 写出口径），不要计进 AST 管线。

---

## 7. 复现

```powershell
# 0) 刷新构建（HEAD 7f130ba7）
#    xl_build(paths=["core","typescript"], targets=["ts"])
node node_modules\typescript\lib\tsc.js -p tsconfig.json

# 1) 基线
node tests\bench\parse-perf.mjs --dts 8 --repeat 5            # 515.8 ms（本机）

# 2) profile
node --cpu-prof --cpu-prof-dir=tmp\prof --cpu-prof-name=next.cpuprofile --cpu-prof-interval=100 `
  tests\bench\parse-perf.mjs --dts 8 --repeat 5
node tests\bench\prof-summary.mjs tmp\prof\next.cpuprofile --top 40

# 3) 计数（只读探针）
node tests\bench\dts-alloc-probe.mjs --files 1 --attribute    # Whole() 调用点归属
node tests\bench\dts-cost-probe.mjs --count --files 3         # 逐方法次数
node tmp\perf-next\count-candidates.mjs                       # 候选规模（3.59 个/次）
node tmp\perf-next\count-getraw.mjs                           # GetRaw/substring 次数
node tmp\perf-next\probe.mjs                                  # 启动/模板/parse/XML 四段

# 4) 已落地的两个实验副本（build/* 均 gitignored）
#    build-exp      = CatalogGuide 位掩码 + 行号表惰性（+3.01%）
#    build-exp-xml2 = XML rope + tag cache（XML −59.2%）
node tests\bench\buffer-ab.mjs --base build --new build-exp --dts 8 --repeat 21
node tmp\perf-next\xml-ab.mjs                                 # XML-only / 写出口径 A/B
node tests\bench\buffer-equivalence.mjs --mode both --base build --new build-exp
node tests\bench\buffer-equivalence.mjs --mode xml --base build --new build-exp-xml2

# 5) 启动装载验证（打包代理，不实装）
node tmp\perf-next\load-only.mjs                              # 327 模块 + loadMs
node tmp\perf-next\startup-bundle-probe.mjs --build           # 生成单文件打包代理（327 模块）
node tmp\perf-next\startup-bundle-probe.mjs --baseline        # 7 个新进程，取中位
node tmp\perf-next\startup-bundle-probe.mjs --bundle          # 7 个新进程，取中位
node tmp\perf-next\e2e-probe.mjs                              # 新进程：装载+解析 8 份 d.ts
node tmp\perf-next\e2e-probe.mjs --bundle                     # 同上，走打包代理
```

---

## 8. 局限（读数字前必读）

1. **单机、单进程、未绑核**；profile 在 Windows 上有效采样 ≈0.9–1 ms，<0.7% 的差异不可信。
2. **profile 的 ms 不等于墙钟**：绝对值含 profiler 与一次性装载开销；本文件只把 self% 按干净基线折算，且标明是折算。
3. **XML A/B 中的 parse 差值是噪声**：三份 build 同进程加载时，parse 读数出现 −3.3%~+1.2% 的相反方向；
   XML 改动不触碰 parse 代码（实验副本 diff 仅 7 个 `ToXmlString` 覆写文件），等价性也不受影响。
4. **启动打包已用「单文件打包代理」验证，但代理 ≠ 真实打包**：代理是「327 模块合成一次读取+一次 `new Function` 编译+一次执行」，
   已包含 1.6 MB 读取与一次全量编译（所以 33.7 ms 不是零成本）；真实 esbuild/rollup 还会加 loader 胶水、可能加 keepNames 包装，
   数字应在同一量级（191→34 ms、净 −157 ms），落地后需重测一次。`constructor.name` 是 XML 标签唯一来源，
   keepNames 是硬前提。
5. **C2 Slot 计数是 Lead 直接包装原型方法统计**，覆盖 8 份 d.ts 全量 parse；它把分析初估从 0.8–2.0% 下调到 ≤0.3%。
6. 本分析**没有验收任何改动**：两个原型都只做了 A/B 与逐字节等价，未跑七道门与 `xl_check`（它们不是提交）。
   真正落地时按各候选「前置门禁」列执行。
7. **XML 的定位已修正（2026-10-23 补）**：XML 不在 AST 流程里；此前把「XML −59%」记成 AST 管线的最大单点是不对的。
   已按证据改为「门禁/XML 输出面」候选（§1.4、§3.1）。AST 投影（shape→AST）是另一条未度量的轴（`cjAst` 参考读数 ≈12% of parse）。
