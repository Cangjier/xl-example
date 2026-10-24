# HANDOFF — impl-wp2-6（WP-2 第六波：阶段 2 逐 unit 单调推进 / 长语句 O(L²) 已消除）

STATUS: PARTIAL（任务 A 落盘并全绿；`statement-scaling` 4 项 FAIL → 2 项，剩余 2 项已归因到 **core 的
per-token Feed 节奏**；任务 B 未做；另外 full 档 `buffer-equivalence` 有 **1 个 ERROR**，
是 WP-2-5 既有的流式挂载缺陷（`=>` 在类型位置被当语句块），已定位到文件与修法，见「关键归因 2」）
BRANCH: impl-wp2-6 @ 02c53419（本文件另起一次提交）
BASE: impl-wp2-5 @ db2418e7（起于 refactor-integration @ a5e31a54 + 契约 G0–G6 + WP-1 enum + WP-2-4/5 流式）

## 做了什么

### A. 阶段 2：`StatementItemScan` 逐 unit 单调推进（O(L²) → O(L)）

阶段 1 的病根（`HANDOFF.wp2-3.md` §性能代价）：`StatementItemScan.Run` 每次都从族的入口重扫
**整个代码前缀**，而引擎每吃一个 unit 就调一次 `Analyze` → 一条长度 L 的 item 累计 O(L²)。
本包把「已经逐格判过的前缀」变成可续扫的**续扫点**，判据一份都没复制：

| 文件 | 改动 |
|---|---|
| `typescript/tokens/statements/statement-scanner.xl.md` | ① `StatementScanResult` 新增 `field Resume:int = -1`（续扫点，-1 = 不可续）；② 新增 `static method NeedMoreAt:(resume:int)`（与 `NeedMore()` 同构，只多续扫点）；③ 给**纯向前循环**加可选末参 `startAt?:int` 并从 `max(入口, startAt)` 起步：`ScanToSemicolon` / `ScanExpressionBody` / `ScanDeclarationBody`；④ 包装函数把 `startAt` 原样交给体：`ScanBody` / `ScanIf` / `ScanFor` / `ScanLoop` / `ScanDo` / `ScanReturnOrThrow` / `ScanRoot`；⑤ `ScanTry` 收参但不用（try 体是闭合括号单元，恒 O(1)）。所有新参**可选、默认 undefined**，既有调用者（root 的 `statement-possible-shape`、`expression-statement-possible-shape`、oracle）行为逐字不变 |
| `typescript/tokens/items/statement-item-scan.xl.md` | 新增 `field ScannedTo:int`（单调续扫点）+ `field LastState:int`；`Run` 改成：状态没变就带 `ScannedTo` 交给 scanner，回来按 `result.Resume` 更新（`Resume < ScannedTo` 就丢弃，整段重扫）；状态变了（`LastState !== State`）一律从头扫——新状态的入口在旧进度之前，旧下标没有意义。删掉「前缀长度相同就复用结果」的早退（`AtEof` 会在长度不变时翻真，G5 的批末再判一次靠它）；`Watermark` 降为纯观测字段。`Decide` 增加 `resume` 参数 |
| `typescript/tokens/items/statement-item-rule.xl.md` | 新增 `field Scan:StatementItemScan \| null = null`（**驻留**扫描状态）；`Analyze` 复用同一实例（`state.Code.length <= 1` 时换新 = 每 item 一把），否则每条 item 都要重扫前缀 |

为什么续扫是**等价**的（写进两个文件的方法注释）：`Scan*` 的纯向前循环每一格的结论只依赖
`code[0..at]`，而前缀只追加 → 判过的格子再判一次结论不变，不判等价于判；`AtEOF` 只出现在
「循环之后的收尾分支」与「头分派」，两者每次调用都会走到，所以续扫与 `AtEof` 正交。
需要跨格回看的判据（`ScanIf` 等 `else`、`ScanDo` 等 `while` 头）在「体已收口、只等下一格」时
返回 `Resume = -1`，状态机丢掉续扫点重来（那时没有在生长的前缀，代价 O(1)）。

### B. 验证资产加强：`tests/body-drive/item-oracle.mjs` 新增「驻留续扫」不变量

每个代码段额外跑一遍：**同一个** `StatementItemScan` 实例从 n=1 续着喂到 N，每个前缀的
`Status/End` 必须与「每个前缀一个新实例」逐字一致（逐段收集 fresh 结果后比对，失败单独报
`[驻留续扫 mine=… vs 新实例 …]`）。这条正是流式路径真正依赖的不变量——`ScannedTo` 一旦算错，
这里与 AST 都会红。读数：88 段 / 450 前缀 / **0 分叉**（含驻留）。

### C. 没有做的（任务 B）

表达式语句流式（第二条 `ExpressionStatementItemRule`）**未做**，理由见「未完成项」1。

## 门禁读数（本分支实测，2026-10-24）

| 项 | 命令 | 结果 | 判定 |
|---|---|---|---|
| xl_build | `paths=["core","typescript"], out="dist"` → 增量 `["typescript"]` | **887 written / 0 error** / 2435 warning | 绿 |
| tsc | `node .\node_modules\typescript\bin\tsc -p tsconfig.json` | exit 0（4.0s） | 绿 |
| quick | `..\tools\gates.ps1 -Tier quick` | **PASS 5.7s** | 绿 |
| standard | `..\tools\gates.ps1 -Tier standard` | **PASS 10.4s**；8 道门 1/8 = KNOWN-RED（基线） | 绿（含已知红） |
| full | `..\tools\gates.ps1 -Tier full -BaseBuild ..\baseline-build\build` | **RESULT: FAIL**（别无他项红）：`buffer-equivalence` **xml PASS 4503 / FAIL 0 / ERROR 1 / 同错 52**；`real-dts-ast` 226/226、`parse-perf` PASS、`class-scaling --base` 21/21 PASS | 红（1 项，见下「buffer-equivalence 的唯一差异」；**WP-2-5 既有**） |
| AST statements | `ast-json.mjs statements` + `ast-json-diff.mjs statements` | **412/412**，结构 0 / 位置 0 / 字段 0 | 绿 |
| AST 全量 | quick 内 `expression statements members` 1214/1214 0/0/0；ast-json 全量见 full | 绿 | 绿 |
| ORACLE | `node .\tests\body-drive\item-oracle.mjs` | 88 段 / **450 前缀 / 0 分叉**（含驻留续扫） | 绿 |
| SPLIT | `node .\tests\body-drive\batch-split.mjs` | 19 段 / **170 断言 / 0 失败** | 绿 |
| STREAM | `node .\tests\body-drive\stream-proof.mjs` | **94 断言 / 0 失败**，4 段语料 | 绿 |
| STMT（性能） | `node .\tests\bench\statement-scaling.mjs --rounds 15 --max-size 500 --base ..\baseline-build\build` | XML 等价 **31/31 PASS**；**FAIL 2 项**（见下） | 红（2/11 同规模项，已归因） |

### statement-scaling 逐档（最终读数，流式开）

| 档 | 250 / 125 | 500 / 250 | 相邻倍数 | 门限 |
|---|---|---|---|---|
| 1 函数体语句数 N | 3.31 | 6.66 | **x2.02** | <2.6 ✅ |
| 2 module 根级语句数 N | 3.88 | 7.84 | **x2.03** | <2.6 ✅ |
| 3 单条长表达式 T | 1.99 | 5.22 | **x2.66** | <2.6 ❌（差 0.06，同一台机器上一轮 2.72、更早 2.16） |
| 4 长 if 头 T | 1.13 | 2.05 | **x1.84** | <2.6 ✅ |
| 5 嵌套块深度 D | 0.87 / 1.75 / 3.65 | | x1.99 / **x2.13** | <2.6 ✅ |

同规模 new/base（门限 ≤1.10）：stmt-count-250 **1.00**、stmt-count-500 **1.10**（临界，上一轮 1.14）、
root-count-250 0.99、root-count-500 1.04、long-if-500 0.99、block-depth-250 0.98、
**block-depth-500 1.14** ❌、**long-stmt-500 2.44** ❌（上一轮 2.18）。

### 关键归因：剩下 2 项 FAIL 全部来自 core 的 per-token Feed，不是 item 扫描

**对照实验（决定性）**：同一份 build，只把 `StatementBlockStream.Enabled` 在构建产物里置 `false`
（源码不动、commit 里没有这个改动；关掉后块回退到 WP-2-4 的「闭合后整块批处理」路径）重跑同一条命令：

```
档 3 倍数 **1.97**；long-stmt-500 **x1.00**；stmt-count-500 **x1.03**；block-depth-500 **x0.99**；
PASS 全部通过（标度 6 对，同规模 11 项，等价 31 项）   ← exit 0
```

即：**流式一关，全部 6 项 PASS**。所以
- WP-2-5 读数 3.87 / 1.17 / 1.15 里的 3.87 与 long-stmt 的 18 倍，**主因是 item 扫描的 O(L²)（本包已消除）**；
- 剩下的 long-stmt-500 ×2.44 / block-depth-500 ×1.14 / 档 3 倍数 2.66，是**流式本身**的 per-token 开销：
  每关闭一个 basic token 就 `UnitToken.OnBasicTokenClosed` → `BasicTokenBatch.Recompute()` → 适配器 → 引擎。

**CPU profile 证据**（`node --prof`，long-stmt-500 ×60，355ms）：self ticks 前三是
`Common.Close` 10.5% / `UnitToken.OnBasicTokenClosed` 8.8% / `BasicTokenBatch.Recompute` 5.3%；
`StatementScanner.ScanToSemicolon` 只剩 **1.8%**（阶段 1 时它是长语句路径的主热点）。
即 item 扫描已经不是瓶颈，剩下的在**喂入节奏**。

**为什么不能在本包修**：`core/syntax/batch/batch-policy.xl.md` 里的 `BatchPolicy`
（`FlushOnSemicolon` / `MaxTokens` / `MaxChars` / `ShouldFlush`）在 core 里是**死代码**——
`core/syntax/unit-token.xl.md:61-88` 的 `OnBasicTokenClosed` 从不调用 `ShouldFlush`，每个 basic token
关闭都无条件 `Reset + Recompute + Feed`。要么让 core 在 `OnBasicTokenClosed` 里问一次 `BatchPolicy`，
要么把 `Reset/Recompute` 从每 token 改成「批只追加」；两条都改 `core/**`，**本包写范围禁止**。

（我自己的每-token 开销已经压到最小：`Feed` 是单 unit 窗口、`ApplyBuilds` 在无 build 时只回写
`Cursor`、`Run` 每次只判新增那一格；`Analyze` 里每 unit 一次 `Run` + 一次结果对象分配是常数。）

### 关键归因 2：`buffer-equivalence` 的唯一差异 = 流式挂载把类型字面量当成语句块（WP-2-5 既有）

full 档唯一的红项是 `buffer-equivalence` 的 **1 个 ERROR**（不是 FAIL：一侧解析、另一侧抛错）。已定位到唯一文件：

```
FAIL  [parse] tests/cases/token/types/type-fn-return-typeliteral.ts
        基线解析成功; 实验抛错: throw by line 0 --->
line 10: type A4 = () => { a: number }
```

**判定实验（同一 build，只翻 `StatementBlockStream.Enabled`）**：

```
--only type-fn-return-typeliteral   流式 ON  → FAIL [parse] … 结论: 不等价（1 项）
--only type-fn-return-typeliteral   流式 OFF → PASS  tests/…  xml=3018B（两侧一致）
```

即：**与流式挂钩、与本包的 item 扫描无关**。根因在 `typescript/run/statement-block-stream.xl.md` 的
`HasStatementPrefix` 白名单：它接受 `=>`（箭头体），但 `type A4 = () => { a: number }` 里的
`=>` 是**函数类型的返回**，后面那个 `{ … }` 是**类型字面量**，被误当成语句块挂了 `StatementBodyItemHost`，
于是 `a: number` 走 `BuildStatement` 抛「表达式没有读完」。WP-2-5 没有跑过 full 档（它的 HANDOFF 只有
AST + stream-proof），所以这条回归到本包才被看到；**不是本包引入**（本包没碰 `statement-block-stream`）。

修法（下一任，写范围允许）：`HasStatementPrefix` 在 `=>` 之外再判一步——若 `=>` 左边是同层的
**类型位置**（`type … =` / `:` 注解 / 泛型实参），就不挂；最小安全做法是**只认 `=>` 且其左侧的 `(`
括号属于一个表达式（不是类型）**。修完必须：`buffer-equivalence --only type-fn-return-typeliteral`
转 PASS + full 档 `buffer-equivalence` **4504 PASS / 0 ERROR** + AST 6167/6167 + real-dts 226/226。

## 未完成项（逐条，带精确下一步）

0. **`buffer-equivalence` 的 1 个 ERROR（最高优先级，因为它让 full 档红）**：见上「关键归因 2」，
   修 `typescript/run/statement-block-stream.xl.md` 的 `HasStatementPrefix`（`=>` 在类型位置不挂），
   验收命令：`node .\tests\bench\buffer-equivalence.mjs --mode both --base ..\baseline-build\build --new build --dts 8`。
   > 这条**不是**本波引入的，但**合并进 `refactor-integration` 前必须修**（TEAM §7.1：full 必须 PASS）。

1. **任务 B：表达式语句流式 —— 未做**（轮次用在 A 的改造、验证与归因上）。
   做法不变（`HANDOFF.wp2-5.md` 未完成项 2）：新增 `typescript/tokens/items/expression-statement-item-rule.xl.md`，
   复用 `ExpressionStatementPossibleShape` 的共享纯谓词（`IsAsiBoundary` / `End` 收口，
   **不要复制判据**），在 `StatementBodyItemHost.CreateRules()` 里追加为第二条规则（`StatementItemRule`
   不动，oracle 口径不变）。然后 `stream-proof` 的 `expectStreaming/expectLegacy` 期望值要同步改。
   > 提醒：按本包的归因，**再让更多块走流式只会把「流式 per-token 开销」摊到更多语料上**，
   > 在 core 的喂入节奏没改之前，性能门槛不会因此变好（`stmt-count` 那类全部由表达式语句组成的语料
   > 正是最吃 per-token 开销的）。建议 **先修 core 的 BatchPolicy，再开任务 B**。
2. **core 的喂入节奏（本包的范围外，价值最高的一步）**：
   - 最小改动：`core/syntax/unit-token.xl.md` 的 `OnBasicTokenClosed` 里，`batch.To/AtEof` 更新后先问
     `this.BatchAdapter.BatchPolicy?.ShouldFlush(...)`，为假就只 `Recompute` 不 `Feed`（批继续长）；
     `StatementBodyItemHost.BatchPolicy` 给一个 `MaxTokens=8/16` 或 `FlushOnSemicolon=true` 的策略。
     注意：批变大后 `Recompute` 是 O(批长)，所以策略要同时把 `Recompute` 改成增量（只算新单元）；
   - 或：`Reset/Recompute` 不再每 token 重建（batch 复用、`CodeIndex` 追加）。
   - 验收：`statement-scaling --rounds 15 --max-size 500 --base ..\baseline-build\build` 全绿（对照实验已经
     证明「关流式 = 全绿」，所以门槛是可达的）。
3. **`tests/body-drive/batch-split.mjs` 的 `stream` 族**：仍未加（`HANDOFF.wp2-5.md` 未完成项 4 的
   理由仍然成立：`stream-proof` 第 5 段用真实解析做「流式 vs 闭合后批处理」的整树 XML 对比，比手工切点强）。
4. **`StatementScanner` 降为 oracle、`statement-possible-shape` 的清理**：本包没动（`statement-possible-shape`
   仍被 root 使用，禁止删）。本包只**加**了可选参数与 `Resume` 字段，没有删任何东西。

## 下一步的精确命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name impl-wp2-7 -From impl-wp2-6 -Base impl-wp2-6
cd impl-wp2-7
# 0) 起点自检（应该全绿）
#    xl_build(cwd=<clone>, paths=["core","typescript"], targets=["ts"], out="dist")
node .\node_modules\typescript\bin\tsc -p tsconfig.json
node .\tests\body-drive\item-oracle.mjs      # 450 前缀 / 0 分叉（含驻留续扫）
node .\tests\body-drive\stream-proof.mjs     # 94 / 0
node .\tests\body-drive\batch-split.mjs      # 170 / 0
..\tools\gates.ps1 -Tier quick
# 1) 先做 core 的喂入节奏（需要 Lead 批准改 core，见未完成项 2），再跑：
node .\tests\bench\statement-scaling.mjs --rounds 15 --max-size 500 --base ..\baseline-build\build
# 2) 有余力再做任务 B（未完成项 1）
```

## 阻塞点

无外部阻塞。**唯一未达标项是性能门槛的 2 项**，且已用对照实验（`Enabled=false`）证明
根因在 `core/syntax/unit-token.xl.md` 的 per-token `Feed` 节奏 + `batch-policy` 是死代码，
修它需要改 `core/**`（本包写范围禁止）。需要 Lead 决定：是否给一个「只改 `unit-token` 的
`OnBasicTokenClosed` + 增量 `Recompute`」的小补丁授权（预计 2 文件 / 20 行）。

本包**没有**改动 `core/**`、`typescript/tokens/files/**`、declarations/members、
`set\TEAM.md` / `tools`；没有 merge / push。

## 踩过的坑（让接任者少花一轮）

- **`NeedMoreAt` 要加在 `StatementScanner` 上，不是 `StatementScanResult` 上**：所有 `Scan*` 里调的是
  `StatementScanner.NeedMore()` / `Complete()` / `Mismatch()`，把新静态方法放到结果类上会得到
  `TS2551: Property 'NeedMoreAt' does not exist on type 'typeof StatementScanner'`（本包第一版就踩了）。
- **`Resume` 只能由「真的逐格判到最后」的循环设置**：`ScanIf` 在「体已收口、等 `else`」的分支必须返回
  不带续扫点的 `NeedMore`，否则下一次会把续扫点交给体扫描、跳过体的收口点 → `End` 落到下一条语句上。
- **状态换了必须丢续扫点**：`Decide` 每次都会重跑头分派（`let` 会从「还要等」变成变量声明 / 标签），
  所以判据是 `State === LastState` 而不是「头没变」。
- **`Analyze` 里的 `new StatementItemScan()` 就是 O(L²) 的全部原因**：`Watermark` 从来没命中过
  （每条 item 一个实例、前缀每轮长一格），所以阶段 1 的「前缀没变就复用」是无效缓存。
- **归因方法**：`--prof` + 只解析一份语料的小脚本（`tmp/probe-long.mjs`，未提交）比猜快得多；
  但 60 次 ×5.9ms 只采到 57 个 tick，样本偏少 —— 要更准就 `--rounds 500`。
- `xl_build` 增量只传 `paths=["typescript"]`（输出 822 行 skipped，可忍受）；全量 380KB 输出会刷屏。
- `ast-json.mjs` 会重写 `typescript/cases` 的 snapshot：跑完必须 `git checkout -- typescript/cases`（本包每次都做了）。
