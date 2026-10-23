# PLAN — xl 解析器重构：批量驱动 + item 表引擎（可开工版）

- 作者：`design-plan-1`（task-5），分支 `design-plan`，基于 `main @ 3eb86b72`
- 输入：`docs/refactor/design-drive.md`（710 行）、`docs/refactor/design-bodies.md`（568 行）、
  `docs/refactor/gates-baseline.md`（378 行）、`set\TEAM.md`、`set\baseline-perf.json`、三份 HANDOFF
- 本文是 **唯一开工依据**：实现成员按 §6 的工作包认领，按 §7 的合并节奏交付，按 §8 的门禁验收。
  与三份设计文档冲突时以本文为准（本文会写明仲裁理由）。
- 本阶段只做设计，**不改任何 `.xl.md`**。所有签名为设计稿，按仓库 xl 规范（`int`/`bool`/`Array<T>`/`method Name:(args)=>ret`）。

---

## 0. 一页摘要

1. **架构 = 一条批量驱动 + 一个 item 表引擎**：basic token 关闭不再回调「候选目录」，而是入批、由宿主
   （`SourceFileShape` / body `Bracket` / block `Bracket`）在边界上调用 `IBatchHost.OnBasicTokens(batch, ctx)`；
   宿主把批次交给**每容器一个** `ItemListEngine`，引擎按 `ItemRule`（判型/边界/收尾/建造）逐 unit 增量推进，
   item 到齐后**整体**交给现有唯一建造器（`TypeBuilder.ParseTypeMember` / `StatementBuilder.BuildStatement` /
   `BuildMember*` / `FromUnits`）。**判定增量、建造整体、不完整留 raw 回退**。
2. **possible 层彻底删除**：`CatalogGuide` / `PossibleShape` / `PossibleShapeCache` / `IComputePossibleShapes` /
   `ShapeStates` / `ComputePossibleShapesStates` 与**全部 408 个 `*possible*.xl.md`**（含 379 个 throw 桩文件）。
   实测：408 文件 / 18,099 行；只有 24 个非 possible 文件引用该层，其中 10 处 `CatalogGuide` 安装点全部在本重构范围；
   `keywords/punctuation/jsdoc/jsx/aliases/...` 的 232 个桩文件**零引用**，是纯删除。
3. **工作包 9 个**：WP-0 基座 →{WP-1 enum 试点, WP-2 语句状态机}并行 →{WP-3 根级, WP-4 interface, WP-5 class}
   并行 → WP-6 module/switch/try+clause → WP-7 删 possible 层 → WP-F 最终验收。DAG 无环，写范围互斥（§6）。
4. **并行组**：`{WP-1, WP-2}`、`{WP-3, WP-4, WP-5}`；其余串行。合并顺序**固定**为 WP-0,1,2,3,4,5,6,7，互不抢跑。
5. **门禁**：每个 commit `quick`；每波 `standard`；**合入 `refactor-integration` 必须 `gates.ps1 -Tier full -BaseBuild ..\baseline-build\build` PASS**。
   KNOWN-RED：`tests/gates/run.mjs`（基线 1/8）与 `statement-scaling`（WP-2 前 informational）均**不作为失败**。
6. **最终验收**：AST 6167 0/0/0；real-dts 226/226；buffer 双 build 4504 PASS/0 FAIL/同错 52；`xl_check` 0 error；
   `parse-perf` 3 轮 `--repeat 5` 中位的中位 ≤ 565 ms；`class-scaling --base` 同轮配对 ≤1.10 且 T=2000 ≤0.90；
   `statement-scaling --base` 同口径达标；`grep PossibleShape|ComputePossibleShapes|CatalogGuide` = 0；串行无并发时段。
7. **裁决 15 条**（U1–U7 / Q1–Q8）见 §4；**用户已定 6 条约束**见 §5（不再讨论）。
8. **需要用户/Lead 拍板的 8 条**见 `docs/refactor/OPEN-QUESTIONS.md`；批准后建议先 spawn `impl-wp0`（+`merge-wp0`），
   WP-0 合并后立刻并行 spawn `impl-wp1`、`impl-wp2`（见 `team-roster.md`）。

---

## 1. 统一架构契约

### 1.1 五层职责（谁拥有什么）

| 层 | 代表单元 | 职责 | 不做什么 |
|---|---|---|---|
| **字符驱动**（不变） | `UnitToken.Process` / `BasicDispatch` / `Transit` / `ExitOrPre` / `Default` | 逐字符分派、造 basic token、Reload 重放 | 不碰批次内容、不判定 item |
| **批次生产**（新增，只在 token 内） | `Token.OnBasicTokenClosed` → 宿主 `BatchFrom`/`BatchSink`/`FlushBatch` | 把已关闭 token 记入宿主 `Data` 的连续区间；按 `BatchPolicy` 决定是否 flush；硬边界强制 flush | 不知道 item 种类、不判 item 终点 |
| **批次消费**（新增，容器唯一实现） | `IBatchHost.OnBasicTokens(batch, ctx):BatchStates` | 把批次交给 `ItemListEngine`；处理 shell handoff；按返回值决定 Done/NeedMore/Reload/Undo | item shape 不实现它 |
| **item 引擎**（新增，core + typescript 规则） | `ItemListEngine` + `ItemRule` + `ItemScanState` | 追加 unit、判型、增量边界、收口判定、调用建造器、raw 回退、Flush | **不新建 AST**（只调既有建造器）；不产生/消费合成 token |
| **item 建造**（不变） | `FromUnits` / `BuildFromCode` / `BuildStatement` / `ParseTypeMember` / `BuildMember*` | 唯一 AST 口径；item 到齐后建一次 | 不改签名、不改语义（等价性保证） |

### 1.2 核心类型（最终形态，**以本节为准**）

```ts
// ---- core/syntax/batch/basic-token-batch.xl.md ----
class BasicTokenBatch            // 唯一批次类型：宿主 Data 的零拷贝视图（= bodies 的 BatchView）
  ## field Host:Token            // 宿主（Data 所有者）
  ## field From:int = -1         // 批首在 Host.Data 的下标（含）
  ## field To:int = -1           // 批尾（不含）；封批时 = Host.Data.length
  ## field AtEof:bool = false    // 文档是否已到末尾（替换 StatementScanner.AtEOF 静态字段）
  ## field FirstStart:int = -1   // 批内第一个非 trivia 单元 SourceRange.Start
  ## field LastEnd:int = -1      // 批内最后一个非 trivia 单元 SourceRange.End
  ## field HasCode:bool = false
  ## field HasLineBreak:bool = false
  ## field Sealed:bool = false
  ## method Count:()=>int                 // To - From
  ## method IsEmpty:()=>bool
  ## method CodeCount:()=>int
  ## method CodeAt:(index:int)=>Token     // 第 index 个非 trivia 单元（惰性下标表，复用）
  ## method Text:()=>string               // Document.GetRaw(FirstStart, LastEnd)
  ## method HasMoreChars:(after:int)=>bool // after 之后还有没有字符（区分 EOF 与窗口末尾）
  ## method Reset:(host:Token, from:int, atEof:bool)=>void

// ---- core/syntax/batch/batch-states.xl.md ----
enum BatchStates { Done = 0; NeedMore = 1; Reload = 2; Undo = 3 }

// ---- core/syntax/batch/i-batch-host.xl.md ----
interface IBatchHost
  property BatchPolicy:BatchPolicy | null
  method OnBasicTokens:(batch:BasicTokenBatch, context:SyntaxContext)=>BatchStates
  method OnChildCreated:(child:Token, context:SyntaxContext)=>void      // 原 OnBracketCreatedEvent，签名不变
  method OnBasicTokenClosed:(token:Token, context:SyntaxContext)=>CloseStates  // 默认实现在 UnitToken
  method CloseBatch:(context:SyntaxContext)=>BatchStates

// ---- core/syntax/batch/item-list.xl.md ----
class ItemScanState
  ## field Start:int = -1        // 当前 item 在宿主 Data 中的起点
  ## field Checked:int = -1      // 已消费到宿主 Data 的哪一格（= tokenIndex + 1）
  ## field Complete:bool = false
  ## field End:int = -1          // item 最后一个代码 unit 的宿主下标
  ## field Code:Array<Token> = []       // 当前 item 的代码 unit（不含 trivia）
  ## field CodeAt:Array<int> = []       // Code 下标 → 宿主 Data 下标
  ## field Angle:int = 0                // 角/括号深度（成员族用）
  ## field LastCode:int = -1
  ## field HasLineBreak:bool = false
  ## method Reset:(start:int)=>void

interface ItemRule
  method Classify:(code:Array<Token>)=>Array<int>            // 读前缀判型；空 = 未知（不抛）
  method Extend:(state:ItemScanState, units:Array<Token>, tokenIndex:int)=>void  // 只推进新 unit
  method Analyze:(state:ItemScanState)=>void                 // 置 Complete/End
  method Build:(host:Token, state:ItemScanState, context:SyntaxContext)=>Token | null  // 只调既有建造器
  method IncludesSeparator:()=>bool                          // ; , 是否进 item 区间（逐族声明）

class ItemListEngine
  ## field Rules:Array<ItemRule>
  ## field Cache:ItemStateCache
  ## method Feed:(host:Token, batch:BasicTokenBatch, context:SyntaxContext):void   // O(本批 unit)
  ## method Flush:(host:Token, context:SyntaxContext, rawFallback:RawFallback)=>Array<Token>
  ## method Reset:()=>void

// ---- core/syntax/batch/batch-policy.xl.md ----
class BatchPolicy               // 软边界策略；硬边界由驱动强制（§1.5）
  ## field FlushOnSemicolon:bool
  ## field FlushOnComma:bool
  ## field FlushOnBracketClose:bool
  ## field FlushOnBracketOpen:bool
  ## field FlushOnLineBreak:bool
  ## field FlushOnKeyword:bool
  ## field FlushOnEof:bool
  ## field MaxTokens:int = 64
  ## field MaxChars:int = 512
  ## method ShouldFlush:(host:Token, token:Token, context:SyntaxContext)=>bool

// ---- core/syntax/batch/basic-kind.xl.md ----
class BasicKind
  ## static field Keyword:int = 1
  ## static field Identifier:int = 2
  ## static field Number:int = 3
  ## static field String:int = 4
  ## static field Regex:int = 5
  ## static field Open:int = 6
  ## static field Punct:int = 7
  ## static field Comment:int = 8
  ## static field Blank:int = 9
  ## static field Eof:int = 10
  ## method static Of:(token:Token, template:Template)=>int
  ## method static TextOf:(token:Token)=>string
```

**明确删掉的设计对象**（与两份设计不同之处，见 §4）：
- bodies §1.4 的 `Token.Transit(context, batch)` / `OnChildCreated(child, ctx, batch)`：**不采用**。
  `Transit` 保持字符入口签名不变；`OnChildCreated` 不带 batch（`OnBracketCreatedEvent` 改名即止）。
- drive §4.4 的 `ItemTable` / `ItemKindInfo` / `EndMode` 枚举作为 **core 公共类型**：**降级为实现细节**。
  判型/结束方式由各 `ItemRule` 自持（`Classify/Extend/Analyze`），只有需要 shadow 诊断时才产出 `kind:int`。
  理由：避免 core 出现 TS 语法概念，且避免「表 + EndMode + rule」三套机制并存（Q2）。
- `PossibleShape` 的槽位缓存：由 `ItemStateCache`（非 possible 协议、无 `SlotOf`）替代。

### 1.3 放 core 还是 typescript

| 放 **core**（语法无关） | 放 **typescript**（TS 语法知识） |
|---|---|
| `basic-token-batch`、`batch-states`、`i-batch-host`、`batch-policy`、`basic-kind`、`item-list`、`item-scan-state`、`item-state-cache`、`raw-fallback`、`handoff-request`、`legacy-batch-adapter`(暂) | 各 `*ItemRule`（root/statement/member/enum/class/interface/module/clause）、`statement-item-scan`、`prefix-scanner`、`source-file-tail-builder`、`shell-finisher`、`clause-tail-builder`、member utils |

判据：**core 只依赖 `Token`/`Data`/`SourceRange`/`SyntaxContext`，不出现关键字、TS 语法分支**。
`ItemListEngine` 放 core（bodies Q2 建议成立）；`ItemRule` 的 kind 常量由 typescript 各规则自持（号段按族分配）。

### 1.4 `LegacyBatchAdapter` 与 `BatchMode` 并存规则

```ts
// core/syntax/batch/legacy-batch-adapter.xl.md（Phase D4 删）
class LegacyBatchAdapter implements IBatchHost
  method OnBasicTokens:(batch, context)=>BatchStates
  // 对批内每个 token 调 host.ComputePossibleShapes(context)（旧路径，逐字不动）；
  // 若旧路径产生 Reload/Built，返回 Reload，否则 NeedMore/Done。
```

关键裁决（**per-host 粒度，不是全局一刀切**）：

- `SyntaxContext.BatchMode:int`：`0=legacy`（所有宿主装 `LegacyBatchAdapter`）、
  `1=batch`（所有已迁移宿主装 `ItemListEngine`；未迁移宿主仍装 adapter）、
  `2=shadow`（**仅限本包正在迁移的那类宿主**：同一批 token 先走新引擎、再走旧 adapter，比较结果，新结果丢弃）。
- 一个宿主在挂载时**二选一**：`ItemListEngine` 或 `LegacyBatchAdapter`。因此迁移可以**逐族推进**：
  WP-1 之后 enum body 走新引擎，其余 body 仍走旧目录；`refactor-integration` 始终全绿。
- **退出条件（WP-7）**：`BatchMode` 只剩 `1` 分支；`LegacyBatchAdapter` 删除；
  `grep "ComputePossibleShapes\|CatalogGuide\|PossibleShape" core typescript` = 0。
- shadow 只用于 **测试/对拍构建**，**不得**进入性能测量路径（否则 2× parse 污染读数）。

### 1.5 硬不变式（INV-1..7，WP-0 起写进代码注释 + 断言）

- **INV-1 单次读**：批次内每个 token 至多被读两次（`Classify` 一次、`Extend/Analyze` 一次）；再扫一遍找起点 = 缺陷。
- **INV-2 单调游标**：`ItemScanState.Checked` 与 `BatchFrom` 只增不减；`Extend` 只处理 `[Checked, To)`；
  **禁止**在热路径调 `StatementScanner.ScanRoot(code)` 重扫（由 `StatementItemScan` 替代，WP-2）。
- **INV-3 推迟建造 + 右向左 splice**：批次内先记录 `PendingBuilds`，消费完后从右往左 `host.Data.splice`，
  每次 splice 后 `Cursor = From + builds.length`。
- **INV-4 flush 代价 = 新 token 数**：空批/无新 token 的 flush 必须 O(1)（`if (batch.To <= engine.LastTo) return`）。
- **INV-5 不许 Data 全扫**：flush 路径禁止 `for (const x of host.Data)`；现存 8 处 O(n²)/全扫（gates §3、drive §6.3）
  按 §6 的归属逐包消灭。
- **INV-6 批次无关性**：只消费已闭合 unit（`SourceRange.EndIndex >= 0`）+ `AtEof` + 白名单文档前瞻（§4 U5）；
  批次可切在 item/装饰器/case 中间，结果必须相同（`batch-split` 门禁证明）。
- **INV-7 单建造器**：`ItemRule.Build` 只调既有建造器；判型与建造冲突时以建造器为准（返回 null / 抛错 → raw 回退）。

### 1.6 `OnBasicTokens` 的返回语义（驱动侧唯一契约）

| 返回 | `context.Index` | 字符重放 | 批次 | 场景 |
|---|---|---|---|---|
| `Done` | 不动 | 无 | 清 `BatchFrom` | 正常 item 建出/继续累积 |
| `NeedMore` | 不动 | 无 | 保留（下一批从 `To` 继续） | item 未到齐 |
| `Reload` | 不动 | `CloseStates.Built` → 压 `ReloadMessage` | 清空；handoff 的 token 由新宿主重放 | 建出形状/挂载改变了字符归属 |
| `Undo` | 不动 | 无 | 交调用方 | 探测型调用/容器交接失败 |

**硬边界 flush（驱动强制，5 条）**：窗口循环结束前；任何 `Reload` 前；宿主 `Quit/TryToClose` 前；
`MountedUnit` 变化前；文件末尾（`buffer.IsEof()`）。

### 1.7 shell handoff（批内 token 交接）

- 只在「批内 token 全部属于新壳前缀」时发生，由「item 起点关键字触发前缀 flush」保证。
- 递归深度上限 8；超限抛 `SyntaxException`（真缺陷，不静默）。
- 断言：`shell.Parent === host && host.MountedUnit === shell`；handoff 后清 `MountedUnit`（照抄 `FinishShell` 的教训）。

---

## 2. 四层入口一览（谁调谁）

```
每字符：  UnitToken.Process → ExitOrPre → ProcessQueue(BasicDispatch.Transit) → Default      （不变）
每 token：token.Close → parent.OnBasicTokenClosed(token, ctx) → 入批 / 可能 FlushBatch       （新增，WP-0）
每批次：  host.OnBasicTokens(batch, ctx) → ItemListEngine.Feed(host, batch, ctx)             （新增）
每 item： ItemRule.Build(host, state, ctx) → 既有建造器 FromUnits/BuildFromCode/BuildStatement（不变，WP-1+）
收口：    host.Close / buffer.IsEof() / 本层 `}` 关闭 → engine.Flush(host, ctx, rawFallback)  （新增，随族）
```

- **item shape 不实现 `OnBasicTokens`**（拒绝 drive D-4 的「每个 shape 接批」）。
- token 形状只实现 `OnBasicTokenClosed`（继承默认）+ `BasicKind.Of` 分类；`Close` 去掉「问父目录」副作用。
- `WrapSymbol`（空白）不通知（保留现状）；注释/字符串/正则/shebang/bom 仍通知（9 个 basic token + EOF 哨兵）。

---

## 3. 与三份设计的接口边界

| 来源 | 本文采用 | 本文调整 |
|---|---|---|
| `design-drive.md` §2/§3 | 批次=宿主 `Data` 视图；`IBatchHost`；`BatchStates`；软/硬边界；handoff；`BatchMode` | `ItemTable`/`EndMode` 降为规则内部实现；`BasicTokenBatch` 增加 `AtEof`/`HasMoreChars` |
| `design-drive.md` §4 | `BasicKind`、首 token 一级分类 + ≤3 前瞻、ASI 判据、recovery 三出口、`EndPossible` 三拆 | 「每 kind 一台 EndMode 状态机」收敛为「每族一支 `ItemRule`」；`StatementItemScan` 是语句族的状态机实现 |
| `design-drive.md` §5 | D0–D5 阶段精神、文件存废、`LegacyBatchAdapter` | 阶段改为工作包（§6），D0 拆成 WP-0，D1 拆成 WP-2/WP-3 |
| `design-bodies.md` §2 | `ItemListEngine`/`ItemRule`/`ItemScanState`/`Feed`/`Flush`/raw fallback/三条硬规则 | `BatchView` 改用 drive 的 `BasicTokenBatch`（`To` 半开）；`Token.Transit(batch)` 不采用 |
| `design-bodies.md` §3–§7 | 成员族复用/重写边界（保留 3 个 util 算法）、语句 `StatementItemScan` + oracle、恢复形 12 条、P0–P6 包精神 | 包重排为 WP-0..7（enum 先行、statement/root 随后、module/clause 最后）；Q 系裁决见 §4 |
| `design-gates.md` §4/§5/§8 | 标度判据、采样协议、基线 build、最终验收 6 条 | 门禁矩阵按包落地（§8）；`statement-scaling` 在 WP-2 前 informational |

---

## 4. 冲突与未决裁决（U1–U7 / Q1–Q8）

> 每条给：**决定 / 理由 / 被拒方案 / 若押错的影响**。实现成员不得再自行改判；有新证据先报 Lead。

| # | 决定 | 理由 | 被拒方案 | 若押错 |
|---|---|---|---|---|
| **U1** flush 时建形状 + 挂载 → `Built` → 字符重放与旧路径等价性 | **不假设，用 shadow 证明**：WP-0 建 shadow 比较器，WP-2/WP-3 每语料跑 `BatchMode=2` 对拍（形状序列 + XML digest + 形状数）；若出现差异，先把该形态列入「混合模式白名单」（该形态走 legacy），差异清单 ≤3 条并写入 HANDOFF | shadow 是唯一低成本证据；逐条人工推理 1200 行 `EndPossible` 不现实 | 直接切 `BatchMode=1` 再靠 AST 门禁兜底 | 差异在 WP-3 收口暴露：回退该 `BatchMode` 默认值，root 包延期，其它包不受影响 |
| **U2** trivia（空白/注释）是否入批 | **入批但标 trivia**（`CodeAt/CodeCount` 过滤），位置与 shell 搬运需要；`HasLineBreak` 由批元信息一次算出 | 不入批会丢 token/位置算错（drive §2.1） | 只记录范围不搬 trivia | 若实测批内 trivia 使 `Data.slice` 变重：退化为「只记录范围」，需重跑位置口径用例，约 1–2 轮 |
| **U3** 两级 handoff（import 壳 → 子句壳）深度 8 是否够 | **保留深度 8 + WP-6 专项用例**（`export import x = require(...)`、`import type {…} from "m" with {…}`、`@dec export declare abstract class`） | 实测上限 2–3 层 | 特判 clause handoff | 超限抛错会红门禁；届时把上限提到 12 或对 clause 预 flush，1 轮 |
| **U4** `SourceFileEndPossibleShape` 拆分切分点 | **WP-3 第一动作：整文件机械搬名为 `SourceFileTailBuilder`（逻辑一字不改），再按 `BuildTrailingDeclaration/BuildStatementSegments/BuildModuleDeclaration` 三入口拆**；不拆成 3 个独立类，除非 profile 要求 | 逐字搬移是等价性的唯一保证；先搬后拆可回退 | 一次性重写为 3 个 builder | 拆错只影响 root 包，`git revert` 该包 |
| **U5** `NextWord/NextChar` 读未 token 化文档 | **保留为白名单例外**：仅用于 `Chain` 续接判据（`else`/`catch`/`finally`/`while`）与 `declare const enum`/`const enum`、装饰器头等**逐字沿用现有判据**；只跳 trivia，缓存用 `EndIndex` + watermark；代码注释写明「白名单」，`batch-split` 覆盖 | 这些是 TS 语法的真实约束；禁掉等于重写语义（高风险） | 全面禁止文档前瞻 | 白名单外偷读会破坏批次无关性；由 `batch-split` + code review 抓，发现即回到白名单 |
| **U6** D1（root）先 vs D2（body）先 | **enum 试点 → 语句状态机 → 根级**（与 bodies 推荐一致，否决 drive 的 root 先行） | root 依赖语句规则（`ScanRoot`）与 `SourceFileTailBuilder`，是最重最高风险的一包；enum 用 5–6 轮验证引擎契约，失败便宜 | root 先行（drive 建议） | 若 enum 试点暴露引擎契约缺陷：只返工 WP-1 + 契约文件，WP-2 未启动，损失 ≈4 轮 |
| **U7** `--no-generic` 假红是否随删 possible 消失 | **不作为任何门禁**；WP-7 末尾跑一次记录结果（可能变绿或变 skip），结果写 HANDOFF/最终报告；**不修 harness** | 它是 `--no-generic` 缩减候选集的假红（TEAM §5.4） | 拿它当验收判据 | 无影响（仅记录） |
| **Q1** `BatchView` 最终形状 | **用 drive 的 `BasicTokenBatch` 单对象**：`From` 含、`To` 不含；新增 `AtEof`/`HasMoreChars`；`Context` 走参数不进批；不引入 bodies 的 `Token.Transit(batch)`/`OnChildCreated(..., batch)` | 零拷贝、单一事实来源、少一层包装与分配 | bodies 的 view 包装 drive 批（多一次分配 + 两套命名） | 若 `To` 口径理解错：全部 rule 差一，`batch-split` 会抓到；修 ~10 文件 1–2 轮 |
| **Q2** `ItemListEngine` 归属 | **core**（`core/syntax/batch/item-list.xl.md`），`ItemRule` 接口也 core；TS 语法知识全在 typescript 各 rule | 引擎只依赖 Token/Data/批次，语法无关；core 已有 token 层 | 放 typescript | 若 core 边界不成立（需要 Template 关键字）：把 `BasicKind.Of` 的关键字表注入 rule，移动 1 文件，便宜 |
| **Q3** `StatementScanner` 长期保留？ | **保留**：运行期只用增量 `StatementItemScan`；`StatementScanner` 作为**测试 oracle** + 共享纯谓词（`NoLineBreakBetween/StartsBinding/IsEOF/NextChar` watermark）继续被 builder 调用 | oracle 差分是状态机正确性的唯一低成本证明；谓词不能复制 | 删除 scanner（或把 oracle 也删） | 无运行期影响；若有实现成员误 import 递归 `Scan*` 进热路径，由 INV-2 断言与 perf 抓到 |
| **Q4** switch clause 内层子表 | **v1 不做 `SubRangeItemList`**：case block 括号挂 `CaseClauses` 表，item=一个 clause，由 `BuildCaseBlock` 一次建；clause 内语句仍由 builder 建。v2 仅在 `statement-scaling` 显示 case 密集形态有收益时再开 | 无实测目标，先省机制 | v1 就做子区间表 | 无回退成本（v2 是增量） |
| **Q5** import/export clause 表何时做 | **WP-6 内独立子步**（不随 WP-2）：它们不依赖语句状态机，但共用 `declarations/**` 写范围 | 避免 WP-2 写范围膨胀与冲突 | 塞进 WP-2 | 若 clause 拖慢 WP-6：可拆 `WP-6b` 独立包，DAG 不变 |
| **Q6** 表达式层 block/箭头体是否复用语句表 | **复用**：`{…}` 块体由「创建该括号的容器」挂表；`StatementBuilder` 与 `ExpressionBuilder` 都经 `BlockShape`/括号 → 同一 `ItemListEngine(Statements)`；**箭头表达式体（无花括号）不覆盖** | 同一块括号不能有两个 owner（bodies Q6 风险）；expression 层不新增表 | expression 层再建一套表 | 若 `BlockShape` 由 expression 创建但 `Data` 语义不同：对该入口退回 raw（`BuildBlock` 原路径），1 轮 |
| **Q7** `BuildBlock` 是否已支持「Data 混有已建形状」 | **WP-2 第一动作核实**：支持 → 直接用；不支持 → 新增 `BuildFromItems(units, items, basePos)` 入口，**绝不改 `BuildBlock` 语义** | 保 AST 等价；bodies 风险 5 | 直接改 `BuildBlock` | 若核实漏掉：block 语料 AST 差，WP-2 内部修复（1–2 轮） |
| **Q8** 语句语料门禁 | **`statement-scaling.mjs` 在 WP-2 前 informational**；WP-2 负责让它可跑且达标（见 OPEN-QUESTIONS Q4 的归属），达标后再由 **Lead/共享文件 owner** 决定是否加入 `gates.ps1` | 当前脚本在生成源上崩溃（gates 附录 A），不能当必过门 | 现在加入 gates.ps1 | 若 WP-2 无法让它绿：最终验收改用「手写长语句语料 + class-scaling + parse-perf」并记录（Lead 裁决） |

---

## 5. 用户已拍板的约束（写死，不再讨论）

1. **possible 层彻底删除**，含全部 throw 桩文件（408 文件 / 18,099 行；`keywords/punctuation/jsdoc/jsx/aliases/literals/trivia/synthetic/names/bindings` 的 232 个桩零引用，纯删除）。
2. **`refactor-integration` 必须全绿**：AST 逐节点 0 差、XML 等价、现有门禁绿；**工作分支中间态可红**。
3. **总 Parse 不劣化**（同轮配对 ≤1.05，上限 565 ms）；**class/interface 大成员体与长语句体的标度用例必须可测改善**
   （同轮 new/base ≤1.10、相邻翻倍 <2.6、class/iface ≤1.8，大档 ≤0.90；最终验收需无并发时段）。
4. **只交付 `refactor-integration` 分支 + 报告**，不碰 `main`。
5. **每个成员 ≤10 assistant 轮次**，未完成写 HANDOFF 换新 agent（接力用 `-From`）。
6. **设计 PLAN 出来后 Lead 暂停向用户确认**，批准后才进入实现。

---

## 6. 工作包与 DAG

### 6.1 DAG（无环）

```
                 ┌──────────────────────────────┐
                 │ WP-0 基座（batch+engine契约） │
                 └───────────────┬──────────────┘
                 ┌───────────────┴───────────────┐
        ┌────────┴────────┐              ┌───────┴────────┐
        │ WP-1 enum 试点  │              │ WP-2 语句状态机│
        └────────┬────────┘              └───────┬────────┘
        ┌────────┴────────┐                      │
   ┌────┴────┐      ┌─────┴─────┐         ┌──────┴──────┐
   │WP-4 iface│     │ WP-5 class│         │ WP-3 根级表 │
   └────┬────┘      └─────┬─────┘         └──────┬──────┘
        └────────┬────────┴──────────────────────┘
                 ┌┴─────────────────────────────┐
                 │ WP-6 module/switch/try+clause│
                 └──────────────┬───────────────┘
                       ┌────────┴────────┐
                       │ WP-7 删 possible │
                       └────────┬────────┘
                       ┌────────┴────────┐
                       │ WP-F 最终验收    │
                       └─────────────────┘
```

- **边**：WP-1→{WP-4,WP-5}；WP-2→WP-3；{WP-2,WP-3}→WP-6；{WP-1..WP-6}→WP-7→WP-F。
- **并行组**：`{WP-1, WP-2}`（均只依赖 WP-0）；`{WP-3, WP-4, WP-5}`（WP-3 依赖 WP-2；WP-4/WP-5 依赖 WP-1）。
- **固定合并顺序**：WP-0 → WP-1 → WP-2 → WP-3 → WP-4 → WP-5 → WP-6 → WP-7 → WP-F。
  并行成员按此顺序合并（后合并者在自己的工作分支 `git fetch` 集成分支后 rebase/merge 再交付，见 §7）。

### 6.2 写范围总表（repo 相对前缀，**互不重叠**）

| 包 | 写范围（允许改/删/增） | 明确不碰 |
|---|---|---|
| WP-0 | `core/syntax/batch/**`（新）；`core/syntax/unit-token.xl.md`；`core/syntax/token.xl.md`；`core/syntax/shape-token.xl.md`；`core/syntax/syntax-context.xl.md`；`core/syntax/basic-tokens/**`；`typescript/tokens/trivia/end-of-file-token-shape.xl.md`；`docs/refactor/file-inventory.md` | 所有 typescript 业务 shape、tests、tools |
| WP-1 | `typescript/tokens/members/**`（enum 相关）；`typescript/tokens/declarations/enum-declaration-shape.xl.md`；`typescript/tokens/declarations/body-guide-util.xl.md`；新增 `typescript/tokens/items/enum-item-rule.xl.md`、`enum-member-item-util.xl.md` | core/batch（契约冻结）、interface/class/statement/root 文件 |
| WP-2 | `typescript/tokens/statements/**`；新增 `typescript/tokens/items/statement-item-scan.xl.md`、`statement-item-rule.xl.md`；`typescript/run/line-terminator.xl.md`（行终止符位图/唯一判据）；`tests/body-drive/item-oracle.mjs`（新）；`tests/bench/statement-scaling.mjs`（若授权，见 OPEN-Q4） | source-file-shape、module-block、declarations/**、members/** |
| WP-3 | `typescript/tokens/files/**`；新增 `typescript/tokens/items/root-item-rule.xl.md`、`source-file-tail-builder.xl.md`；删 `typescript/tokens/files/*possible*` | statements/**、declarations/**、members/** |
| WP-4 | `typescript/tokens/types/**`（interface 成员相关）；`typescript/tokens/declarations/interface-declaration-shape.xl.md`；新增 `typescript/tokens/items/member-item-util.xl.md`、`interface-item-rule.xl.md`；`tests/body-drive/batch-split.mjs`（interface 组；与 WP-2 共用文件由 WP-2 建、WP-4 只加 family 配置） | class 文件、statements/**、core/batch |
| WP-5 | `typescript/tokens/types/class-*.xl.md`；`typescript/tokens/declarations/class-declaration-shape.xl.md`；新增 `typescript/tokens/items/class-member-item-util.xl.md`、`class-item-rule.xl.md` | interface 文件、member-boundary、statements/** |
| WP-6 | `typescript/tokens/declarations/module-block-shape.xl.md`、`import-*.xl.md`、`export-*.xl.md`；`typescript/tokens/statements/case-*.xl.md`、`switch*.xl.md`、`try*.xl.md`；新增 `typescript/tokens/items/module-item-rule.xl.md`、`clause-item-rule.xl.md`；删对应 possible 文件 | source-file-shape、interface/class 文件、core/batch |
| WP-7 | 剩余全部 `*possible*.xl.md`（含 core 4 个共享协议）；`core/syntax/unit-token.xl.md`（删 `CatalogGuide` 字段/`BatchMode` 分支）；`core/syntax/batch/legacy-batch-adapter.xl.md`（删）；`typescript/**` 中所有遗留引用；`tests/**` 中仅引用 possible 的脚本 | 不改 AST 建造逻辑、不改 tests/body-guide/harness |
| WP-F | `docs/refactor/final-report.md`（新）、`docs/refactor/perf-report.md`（新） | 不改代码 |

> 边界规则：**core/syntax/batch/** 由 WP-0 冻结**。之后任何包需要改契约（含 `ItemListEngine`/`ItemScanState`/`ItemRule`），
> 必须报 Lead，由**当前最后一个已合并包的 owner**在一个独立小提交里改并先合并，其它包再 rebase（避免并行冲突）。
> `tests/body-drive/batch-split.mjs` 由 WP-2 建骨架，WP-4/WP-5/WP-6/WP-3 只允许追加自己的 family 配置段（不同文件区段）。

### 6.3 工作包卡片

#### WP-0 基座：批量驱动 + item 引擎契约 + shadow + inventory

| 项 | 内容 |
|---|---|
| 目标 | 零行为变化地建立批次层与引擎契约，供所有后续包依赖 |
| 交付 | ① `core/syntax/batch/` 新 11 文件（batch/states/host/policy/basic-kind/item-list/item-scan-state/item-state-cache/raw-fallback/handoff-request/legacy-batch-adapter）；② `UnitToken` 加 `BatchFrom/BatchSink/OnBasicTokenClosed/FlushBatch`；③ 11 个 basic token 的 `Close` 改回调（9 个 + Bracket + EOF 哨兵）；④ `SyntaxContext.BatchMode/BatchEpoch/Handoff`；⑤ shadow 比较器（形状序列 + XML digest + 形状数）；⑥ `docs/refactor/file-inventory.md`（408 文件清单/行数/引用关系） |
| 依赖 | 无（从 `refactor-integration` 起，或 main 首次） |
| 验收 | `xl_build`+`tsc` 0 error；`gates -Tier quick` PASS；`-Tier full -BaseBuild ..\baseline-build\build` PASS；`BatchMode=0` 时 AST 6167 0/0/0、real-dts 226/226、buffer 4504/0/52；`xl_check` 0 error；shadow 自检（`BatchMode=2` 对 3 份语料差异 0）；适配层开销 ≤3%（`parse-perf` 配对） |
| 轮数/波次 | **8–10 轮**（波 1；可能 `impl-wp0-2` 接力）；独立可回滚（该包单分支） |
| 风险 | 批边界切错（R2）；适配层虚调用开销（R4）；11 处 Close 改动量大 |
| 回滚 | `git revert` 该合并；WP-0 之前 `refactor-integration` = main 基线 |

#### WP-1 enum body 试点（引擎契约首次实战）

| 项 | 内容 |
|---|---|
| 目标 | 用最简单的成员族验证 `ItemListEngine`/`ItemRule` 契约（Feed/Flush/raw fallback/区间口径），并删 enum 的 possible 文件 |
| 交付 | enum body 挂 `ItemListEngine(EnumItemRule)`；`EnumMemberPossibleUtil.Analyze` 等算法移入 `typescript/tokens/items/enum-member-item-util.xl.md`；改 `enum-declaration-shape`（去 `MountBodyGuide`/`CatalogGuide`）；删 `enum-member-possible-shape.xl.md`、`enum-declaration-end-possible-shape.xl.md`；`body-guide-util` 删 `MountBodyGuide/CreateShapesCache` |
| 依赖 | WP-0 已合并 |
| 验收 | `body-guide --target=enum --all` 46/46；`ast-json-diff` 0/0/0；`batch-split --family=enum` 全过；`gates quick/standard` PASS；`xl_check` 0 error |
| 轮数/波次 | 5–6 轮（波 2，与 WP-2 并行） |
| 风险 | 引擎契约不足 → 只返工本包 + 契约小提交；enum 恢复形「不按换行切」必须保持 |
| 回滚 | 单包 revert，其余包不受影响 |

#### WP-2 语句状态机 + block 表（收益主战场）

| 项 | 内容 |
|---|---|
| 目标 | `StatementItemScan` 增量状态机替代运行期 `ScanRoot/ScanBody` 重扫；每个 `{…}` 块括号挂 `ItemListEngine(Statements)`；消 O(n²) |
| 交付 | ① `statement-item-scan.xl.md`（`Scan*` 13 组判据逐 unit 直译，显式状态号）；② `statement-item-rule.xl.md`；③ `typescript/tokens/statements/block-shape.xl.md` 挂表（`{` 创建时）；`typescript/run/line-terminator.xl.md` 改为从批次元信息取 `HasLineBreak`（消逐字符 while）；④ `StatementBuilder` 加 `BuildFromItems` 入口（Q7）；⑤ `StatementScanner` 降为 oracle + 共享纯谓词；⑥ 删 `statement-possible-shape` 与 statements 下 20 个 possible；⑦ 新门禁 `tests/body-drive/item-oracle.mjs`；⑧ `batch-split` 骨架；⑨ `statement-scaling` 校准（若授权） |
| 依赖 | WP-0 已合并 |
| 验收 | `item-oracle` 全过（逐前缀 Status/End 与 `StatementScanner` 完全一致）；`statement-scaling --rounds 15 --base ..\baseline-build\build` 相邻 <2.6、同规模 ≤1.10、大档 ≤0.90、XML 等价；AST statements 412/412；`gates quick/standard`；`batch-split` 全过 |
| 轮数/波次 | **9–10 轮 + 预计 `impl-wp2-2` 接力**（波 2，与 WP-1 并行；合并顺序在 WP-1 之后） |
| 风险 | 状态机直译漏分支（R7）；`BuildBlock` 已建形状兼容（Q7）；O(n²) 转移（INV-2/§6.3b/d） |
| 回滚 | 单包 revert；`StatementScanner` 未被改语义，回退后行为=基线 |

#### WP-3 根级 source-file 表 + tail builder（含 §6.3 f/e 热点）

| 项 | 内容 |
|---|---|
| 目标 | `SourceFileShape` 挂 `ItemListEngine(RootItemRule)`；`SourceFileEndPossibleShape` → `SourceFileTailBuilder`（先整文件机械搬，再拆三入口）；EOF 走显式 EOF 批；消 `SourceFileShape.Close` 三次全扫 |
| 交付 | 改 `source-file-shape.xl.md`；新 `root-item-rule.xl.md`、`source-file-tail-builder.xl.md`；删 `typescript/tokens/files/*possible*`；root 与 statement 共享 `StatementItemScan`；`Token.WhichUnitRangeContains` 加 `LastChild` 快路径（若 WP-0 未做） |
| 依赖 | WP-2 已合并（语句规则 + 行终止符位图） |
| 验收 | `gates -Tier full -BaseBuild` PASS；AST 6167 0/0/0；real-dts 226/226；buffer 4504/0/52；`parse-perf --repeat 5` ×3 中位的中位 ≤565 ms；`batch-split --family=root` 全过 |
| 轮数/波次 | 7–9 轮（波 3，与 WP-4/WP-5 并行） |
| 风险 | U1/U4 押错；root 是全语料入口，红面最大 |
| 回滚 | 单包 revert；root 回退后其它族仍走新引擎（per-host 并存） |

#### WP-4 interface body

| 项 | 内容 |
|---|---|
| 目标 | interface body 挂 `ItemListEngine(InterfaceItemRule)`；7 类判定表沿用 `docs/member-possible-design.md`（冻结）；移动 `MemberPossibleUtil` 出 possible 文件 |
| 交付 | `typescript/tokens/items/member-item-util.xl.md`（`MemberPossibleUtil` 算法原样 + `MemberBoundary` 不动）；`interface-item-rule.xl.md`；改 `interface-declaration-shape`、`property-signature-possible-shape` 的调用点（`type-builder` 若需）；删 7 个 interface 候选 + `interface-declaration-end-possible-shape`；`batch-split --family=interface` |
| 依赖 | WP-1 已合并（契约） |
| 验收 | `body-guide --target=interface --all` 35/35、gen 25/25、member-start 23/23、recovery 16/16、util 10/10；`class-scaling --base` class/iface ≤1.8 且 XML 21/21；AST 0/0/0；`gates standard` PASS |
| 轮数/波次 | 7–8 轮（波 3，与 WP-3/WP-5 并行） |
| 风险 | 区间口径（含 `;`/`,`）混错 → End 差；`MemberParsedWhole` 恢复形 10/10 |
| 回滚 | 单包 revert；interface 回退不影响 class |

#### WP-5 class body

| 项 | 内容 |
|---|---|
| 目标 | class body 挂 `ItemListEngine(ClassItemRule)`；复用 `ClassMemberPossibleUtil` 算法（Extend/ScanBoundary/Analyze/DecoratorHeadAt/BasePos）；删 9 候选 + catch-all + end |
| 交付 | `class-member-item-util.xl.md`（算法换宿主）；`class-item-rule.xl.md`；改 `class-declaration-shape`；删 class 候选文件；`batch-split --family=class`；恢复形探针扩到 `tests/body-guide` recovery 之外 |
| 依赖 | WP-1 已合并 |
| 验收 | `body-guide --target=class --all` 54/54；`class-scaling --base --rounds 15` 12 档 PASS、同轮配对 ≤1.10、T=2000 ≤0.90、XML 21/21；AST 0/0/0；`gates standard` |
| 轮数/波次 | 7–8 轮（波 3，与 WP-3/WP-4 并行） |
| 风险 | 装饰器锚定/修饰词边界最易切错；属性初始化器里的 `{`/`(` 必须已闭合 |
| 回滚 | 单包 revert |

#### WP-6 module / switch / try + import-export clause

| 项 | 内容 |
|---|---|
| 目标 | module body 挂 `ItemListEngine(ModuleItemRule)`（ambient 语义，`BuildMember` 一次/item，保 `DataCursorAt`）；case block 挂 `CaseClauses`；try 三个块各自挂 `Statements`；import/export clause 小表；删对应 possible |
| 交付 | 改 `module-block-shape`、`case-block/switch/try` 相关、`import-*/export-*` shape；新 `module-item-rule.xl.md`、`clause-item-rule.xl.md`；删 `declarations/*possible*` 剩余与 clause 候选；`batch-split --family=module/clause` |
| 依赖 | WP-2、WP-3 已合并 |
| 验收 | `real-dts-ast` 226/226；`typescript.d.ts` 单文件计时 ≤ 基线（同轮配对）；AST 6167 0/0/0；buffer 等价；`gates standard`；`parse-perf` ≤565 ms |
| 轮数/波次 | 8–10 轮（波 4；可能 `impl-wp6-2`） |
| 风险 | `BuildMember` 的 `Pos` 重锚对「Data 混已建形状」敏感（bodies 风险 4）；ambient 无分号收口 |
| 回滚 | 单包 revert；module 回退不影响 root/statement |

#### WP-7 删除 possible 层

| 项 | 内容 |
|---|---|
| 目标 | 删完全部 `*possible*.xl.md` 与共享协议、`LegacyBatchAdapter`/`BatchMode` 0/2 分支；`xl_check`/`tsc`/门禁可重建 |
| 交付 | 删剩余 ~232 个桩 + 残余真实文件；删 `core/syntax/{catalog-guide,possible-shape,possible-shape-cache,i-compute-possible-shapes,compute-possible-shapes-states,shape-states}.xl.md`；`UnitToken` 去 `CatalogGuide` 字段；`BatchMode` 只剩 1；删 shadow 比较器；退役仅引用 possible 的测试脚本；`xl_orphans` 清 dist 残留 |
| 依赖 | WP-1..WP-6 全部合并 |
| 验收 | `grep -r "PossibleShape\|ComputePossibleShapes\|CatalogGuide" core typescript` = 0；`xl_check` 0 error；`tsc` 0 error；`dist/ts` 文件数从 872 降到 ≈465+新增（预期 480±15）；`gates -Tier full -BaseBuild` PASS；`gates -Strict` 结果记录（KNOWN-RED 除外） |
| 轮数/波次 | 4–6 轮（波 5；机械 grep→删→build→tsc 循环，分批 commit） |
| 风险 | 删除风暴 import 断裂（R5）；`catalog-guide` 还有 16 处非 possible 引用需先清零 |
| 回滚 | 按批 commit（每 20–40 文件一批），可只回退某批；共享协议删除是最后一批 |

#### WP-F 最终验收 + 交付报告

| 项 | 内容 |
|---|---|
| 目标 | 在干净 clone 的 `refactor-integration` 上跑**串行、无并发**的完整验收，产出最终报告与性能证据 |
| 交付 | `docs/refactor/final-report.md`（验收清单逐项 + 命令 + 读数 + 是否达标）、`docs/refactor/perf-report.md`（profile 前后对比、标度读数、并发声明）；`git tag refactor-integration/final` |
| 依赖 | WP-7 已合并 |
| 验收 | §8.4 全部通过（含 3 轮 parse-perf、class/statement 标度、XML、AST、real-dts、xl_check、grep 0） |
| 轮数/波次 | 3–4 轮（波 6，独立 `verify-final` 成员） |
| 回滚 | 无代码改动；若验收不过，报 Lead 定位到包，重开对应包 |

### 6.4 每包轮数与波次汇总

| 波次 | 成员（并行） | 包 | 预估轮数 | 合并 |
|---|---|---|---|---|
| 1 | impl-wp0 | WP-0 | 8–10 | merge-wp0 |
| 2 | impl-wp1、impl-wp2（并行） | WP-1 / WP-2 | 5–6 / 9–10(+接力) | merge-wp1 → merge-wp2 |
| 3 | impl-wp3、impl-wp4、impl-wp5（并行） | WP-3 / WP-4 / WP-5 | 7–9 / 7–8 / 7–8 | merge-wp3 → 4 → 5 |
| 4 | impl-wp6 | WP-6 | 8–10(+接力) | merge-wp6 |
| 5 | impl-wp7 | WP-7 | 4–6 | merge-wp7 |
| 6 | verify-final | WP-F | 3–4 | 直接打 tag |

---

## 7. 合并节奏（`refactor-integration` 只由独立 merger 更新）

### 7.1 角色与铁律

- **实现成员不合并、不 push 集成分支**；只交付自己的工作分支（commit + HANDOFF）。
- **只有 `merge-*` 成员**在**自己的 clone** 里合并、跑门禁、push 回 `..\upstream.git`。
- merger **不修改源码**解决冲突；不合并文档噪音（HANDOFF 等）；每次合并必须附完整门禁读数。

### 7.2 标准动作（逐包，命令可直接复制）

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name merge-wp1 -Base refactor-integration   # 每个包一个新 clone（或在前一个 merge-* 里复用）
cd merge-wp1
..\tools\fetch-branch.ps1 -From impl-wp1 -Branch impl-wp1
git merge --no-ff impl-wp1/impl-wp1 -m "merge WP-1 enum pilot (impl-wp1 @ <short-sha>)"
# xl_build 工具：cwd=<merge-wp1> paths=["core","typescript"] targets=["ts"] out="dist"
node .\node_modules\typescript\bin\tsc -p tsconfig.json
..\tools\gates.ps1 -Tier full -BaseBuild ..\baseline-build\build
# 全绿后：
git push ..\upstream.git HEAD:refactor-integration
git tag merge/WP-1-<n> HEAD
git push ..\upstream.git merge/WP-1-<n>
```

**首批（WP-0）从 `main` 起**：`new-member -Name merge-wp0`（Base 默认 main）→ 合 `impl-wp0` → 推 `refactor-integration`。
成功后，`refactor-integration` 才存在。

### 7.3 commit / tag 约定

- 工作分支：`WP-<n>: <做了什么>`，每个可独立验证小块一次 commit（不攒到最后）。
- 合并 commit：`merge WP-<n> <name> (<impl-folder> @ <sha>)`；**禁止 squash**（保留工作分支可回滚点）。
- tag：`merge/WP-<n>-<seq>`（seq 从 1 起，同一包返工重合并则 +1）；最终 `refactor-integration/final`。
- 文档合并：批准后由 `merge-docs` 把 `design-plan` 的 `docs/refactor/{PLAN,team-roster,OPEN-QUESTIONS}.md` 以 docs-only commit
  合入 `refactor-integration`（实现成员基于集成分支起步时即可读到 PLAN）；**其余设计文档合不合由 Lead 定**。

### 7.4 冲突处理

1. merger 发现冲突 → **`git merge --abort`**，不手工改代码。
2. `send_message` 给 Lead：包名、冲突文件清单、双方 sha、冲突片段原文。
3. 对应 impl 成员在自己的 clone：`fetch-branch -From merge-wpX -Branch refactor-integration`（或 Lead 指定）→
   `git rebase`/`git merge` 集成分支 → 解冲突 → 重跑 quick/standard → 重新交付。
4. 重开一个 `merge-wpX-2`（或同一 merger 重试），tag seq +1。

### 7.5 失败回滚

- 门禁红：**不 push**；`git merge --abort` 或 `git reset --hard <merge 前 sha>`；报 Lead + impl owner。
- 已 push 但事后发现红：`git revert -m 1 <merge-sha>` 生成回滚 commit 再 push；**不要**改写已合并历史，
  除非 Lead 明确批准 `push --force`（本地 bare，允许但要记录旧 sha）。
- 每个 merge tag 都是回滚锚点；`baseline-build` 永不受影响。

### 7.6 merger 安排

| merger | 负责 | 备注 |
|---|---|---|
| `merge-docs` | design-plan 文档合并 | 复核者，1–2 轮 |
| `merge-wp0` | WP-0 | 首个；从 main 起 |
| `merge-wp1`、`merge-wp2` | WP-1、WP-2 | 可复用同一成员连做（每包 2–3 轮） |
| `merge-wp3`、`merge-wp4`、`merge-wp5` | 波 3 三包 | 建议一个 merger 顺序做 3 次，或 3 个独立成员 |
| `merge-wp6`、`merge-wp7` | WP-6、WP-7 | 删除包合并后必须跑 `-Strict` 并记录 |
| `verify-final` | WP-F 验收 | 不合并，只出报告 + tag |

---

## 8. 门禁矩阵与最终验收

### 8.1 门禁定义（缩写）

| 缩写 | 命令（clone 根） | 期望 |
|---|---|---|
| **B** | `xl_build`(cwd=clone, paths=[core,typescript], targets=[ts], out=dist) → `node .\node_modules\typescript\bin\tsc -p tsconfig.json` | 0 error；tsc exit 0 |
| **Q** | `..\tools\gates.ps1 -Tier quick` | PASS（~6 s） |
| **S** | `..\tools\gates.ps1 -Tier standard` | PASS（~12 s） |
| **F** | `..\tools\gates.ps1 -Tier full -BaseBuild ..\baseline-build\build` | PASS（~32 s；含真双 build） |
| **AST** | `node .\typescript\cases\ast-json-diff.mjs` | 6167 用例，结构 0 / 位置 0 / 字段 0 |
| **BD** | `node .\tests\body-guide\harness.mjs --target=all --all` | interface 35/35、enum 46/46、class 54/54、util 10/10 |
| **RD** | `node .\typescript\cases\real-dts-ast.mjs` | 226/226 |
| **BUF** | F 内或 `buffer-equivalence --mode both --base ..\baseline-build\build --new build --dts 8 --quiet` | xml/digest 4504 PASS / 0 FAIL / 同错 52 |
| **PERF** | `parse-perf --dts 8 --repeat 5` ×3 轮，取 TOTAL 中位的中位 | ≤565 ms（基线 538×1.05），且同轮配对 ≤1.05 |
| **CLS** | `class-scaling.mjs --build build --base ..\baseline-build\build --rounds 15` | 12 档 PASS；同规模 new/base ≤1.10；T=2000 ≤0.90；XML 21/21 |
| **STMT** | `statement-scaling.mjs --rounds 15 --base ..\baseline-build\build` | 同上口径（WP-2 前 informational） |
| **ORACLE** | `node .\tests\body-drive\item-oracle.mjs` | 全过（WP-2 建） |
| **SPLIT** | `node .\tests\body-drive\batch-split.mjs [--family=...]` | 全过（WP-2 建骨架） |
| **XLC** | `xl_check`(cwd=clone, paths=[core,typescript], targets=[ts]) | 0 error（2442 warning 不阻塞） |
| **GREP** | `grep -r "PossibleShape\|ComputePossibleShapes\|CatalogGuide" core typescript` | 0 命中（WP-7 退出条件） |

### 8.2 每包门禁矩阵（最小集）

| 包 | 每 commit | 包内专属 | 合并前（merger 必跑） |
|---|---|---|---|
| WP-0 | B+Q | XLC；shadow 自检；BatchMode=0 的 AST/BD/RD/BUF；适配层开销 ≤3% | **S + F + AST + RD + BUF + PERF 配对** |
| WP-1 | B+Q | BD(enum 46/46)、AST；SPLIT(enum) | **S + F + AST + BUF + XLC** |
| WP-2 | B+Q | ORACLE、SPLIT、AST(statements 412/412)、STMT（未绿先记录） | **S + F + AST + RD + BUF + STMT + PERF** |
| WP-3 | B+Q | AST、RD、BUF；SPLIT(root) | **S + F + AST + RD + BUF + PERF** |
| WP-4 | B+Q | BD(interface 全组)、AST、SPLIT(interface)、CLS 结构断言 | **S + F + AST + BUF + CLS** |
| WP-5 | B+Q | BD(class 54/54)、恢复形探针 10/10、SPLIT(class) | **S + F + AST + BUF + CLS** |
| WP-6 | B+Q | RD、typescript.d.ts 单文件计时、SPLIT(module/clause) | **S + F + AST + RD + BUF + PERF** |
| WP-7 | B+Q | GREP、XLC、dist 文件数、`gates -Strict`（记录） | **S + F + AST + RD + BUF + F** |
| WP-F | — | 串行全套 + 报告 | — |

### 8.3 KNOWN-RED / 排除项处置（informational，不算失败）

| 项 | 处置 |
|---|---|
| `node .\tests\gates\run.mjs` 基线 1/8 | **informational**；`-Strict` 才失败；不要修（根级 `cjcli` 引用已删的 `dawn/**` + coverage 依赖缺失） |
| `statement-scaling.mjs` 当前崩溃（gates 附录 A） | **WP-2 前 informational**；WP-2 负责可跑化与达标（归属见 OPEN-Q4）；达标后**由 Lead/共享文件 owner** 决定是否进 `gates.ps1` |
| `body-guide --no-generic` 假红 | **禁止当门禁**（TEAM §5.4）；WP-7 后记录一次结果（U7） |
| 根级 `xl build` / `npm run build` | 禁止（E1006 `dawn`）；只构建 `core`+`typescript` |
| 生成物/快照 | `dist/`、`build/` 不进 git；`ast-json.mjs` 会重写 `typescript/cases/*.cj-ast.json`，跑完 `git checkout -- typescript/cases` |

### 8.4 最终验收清单（WP-F，逐项勾选，串行无并发）

1. `refactor-integration` 干净 clone（`new-member -Name verify-final -Base refactor-integration`），`xl_build`+`tsc` 0 error。
2. `gates.ps1 -Tier quick` / `-Tier standard` PASS。
3. `gates.ps1 -Tier full -BaseBuild ..\baseline-build\build` → **RESULT: PASS**（唯一允许 RED 是 `tests/gates/run.mjs`）。
4. AST 全量 6167/6167、结构 0 / 位置 0 / 字段 0（用例数不减少）。
5. `real-dts-ast` 226/226。
6. XML 双 build：4504 PASS / 0 FAIL / 同错 52；`class-scaling --base` 21/21；`statement-scaling --base` 全 PASS。
7. PERF：3 轮 `--repeat 5` 中位的中位 ≤565 ms；同轮配对 ≤1.05。
8. CLS：12 档 PASS、同规模 ≤1.10、T=2000 ≤0.90；STMT：同口径达标（若最终仍不可跑，按 OPEN-Q4 裁决记录为「未达成性能验收」并报告 Lead）。
9. `xl_check` 0 error；`GREP` = 0；`dist/ts` 文件数 ≈480±15（从 872 下降）。
10. 报告写明「测量时段是否有其它 agent 并发」；`docs/refactor/final-report.md` + `perf-report.md` 提交；打 tag `refactor-integration/final`。

---

## 9. 删除清单策略（possible 层）

### 9.1 实测清单（本机核对，2026-10-24，源仓库只读）

- **408 个 `*possible*.xl.md` / 18,099 行**；其中 **379 个文件含 `throw`**、共 759 行 throw。
- 分布：`keywords 84`、`punctuation 61`、`types 45`、`jsdoc 43`、`aliases 32`、`expressions 32`、
  `declarations 31`、`statements 20`、`jsx 12`、`members 10`、`literals 10`、`trivia 9`、`synthetic 7`、
  `files 3`、`bindings 3`、`names 2`、`core/syntax 4`。
- **只有 24 个非 possible 文件引用该层**，`CatalogGuide` 安装点 16 个文件（含 core 协议自身）。
- `keywords/punctuation/jsdoc/jsx/aliases/literals/trivia/synthetic/names/bindings` 的 **232 个文件是纯 throw 桩、零引用**
  （抽查 `abstract-keyword-possible-shape.xl.md`：两个方法体均 `throw`，仅自身被 grep 命中）。

### 9.2 退役顺序（先证明替代、后删共享）

| 步 | 做什么 | 归属 | 判据 |
|---|---|---|---|
| D-a | **移走 3 个仍被复用的算法**：`ClassMemberPossibleUtil` → `tokens/items/class-member-item-util`；`MemberPossibleUtil`（在 `property-signature-possible-shape` 里）→ `tokens/items/member-item-util`；`EnumMemberPossibleUtil` → `tokens/items/enum-member-item-util`；`MemberBoundary` 原名不动 | WP-4/WP-5/WP-1（各自同 commit） | 新文件被规则 import；旧文件不再被非自身引用 |
| D-b | **逐族删**：该族 item 表落地的**同一 commit**里删该族 `*possible*`、end-possible、`MountBodyGuide` 调用（禁止双写） | WP-1/2/3/4/5/6 | 该族 `batch-split` + BD 全绿；grep 该族符号 0 |
| D-c | **删核心协议**：`catalog-guide`、`possible-shape`、`possible-shape-cache`、`i-compute-possible-shapes`、`compute-possible-shapes-states`、`shape-states`；`UnitToken.CatalogGuide` 字段、`ComputePossibleShapes*` 方法、`BatchMode` 0/2、`LegacyBatchAdapter`、shadow 比较器 | WP-7（最后一批 commit） | 24 个引用文件的出边全部清零；`xl_check` 0 error |
| D-d | **清 232 个死桩**（keywords/punctuation/…）：按目录分批删，每批 40 个后 `xl_build`+`tsc` 验证 | WP-7（在 D-c 之前做，风险低） | 每批 0 error；文件数递减符合预期 |
| D-e | **测试/harness 退役**：`grep` 找 `tests/**` 中 import possible 符号的脚本，逐个删或改到新门禁；**`tests/body-guide/harness.mjs` 保留**（它是成员族等价门禁，不依赖 CatalogGuide 协议，只依赖 `BuildMembers`/`ParseTypeMember`）；`tests/gates/run.mjs` 不动 | WP-7 | 全部门禁可执行；无 `Cannot find module` |
| D-f | **重建验证**：`dist` 清空后 `xl_build` → `tsc` → Q/S/F；`xl_orphans` 清残留；记录 `dist/ts` 文件数 | WP-7 | 见 §8.4 第 9 条 |

### 9.3 保留 / 改名清单

- **保留符号与文件**：`StatementBuilder`、`ExpressionBuilder`、`TypeBuilder`、`StatementScanner`（角色降为 oracle + 纯谓词）、
  `BodyGuideUtil`（`IsBodyBracket/MountShell/CollectBodyMembers/FinishShell/BasePos`）、`MemberBoundary`、
  各 `XxxShape.FromUnits/BuildFromCode`（一行不改）、`MissingDeclarationPossibleShape` 的**行为**（迁移为新的缺失节点 builder，文件名不再含 possible）。
- **改名迁出**：3 个 `*PossibleUtil` 类 → `tokens/items/*-item-util`（算法逐字搬，类名去掉 possible 语义）。
- **不保留**：`CatalogGuide`/`PossibleShape`/`PossibleShapeCache`/`IComputePossibleShapes`/`ShapeStates`/`ComputePossibleShapesStates`/
  `LegacyBatchAdapter`/shadow 比较器；所有 `*possible-shape.xl.md`、`*possible-util.xl.md`（迁出后删）。

---

## 10. 风险与回滚点（≥8）

| # | 风险 | 触发信号 | 缓解 | 回滚点 |
|---|---|---|---|---|
| R1 | **U1 押错**：flush 建形状 + 挂载与旧路径不等价 | shadow 差异 >0；AST 差 | 差异形态进「混合模式白名单」（该形态走 legacy），清单 ≤3 条报 Lead；不阻塞其它形态 | 该包 revert；BatchMode 保持 0 |
| R2 | **批次口径错**（`To` 含/不含、trivia 归属） | batch-split / AST 位置差 | WP-0 冻结语义 + fake-host 单测 + 断言 `BatchDebug.Assert` | WP-0 revert |
| R3 | **shadow 双跑成本**污染性能与 CI | parse-perf 出现 ~2× 或波动 | shadow 仅测试构建、默认 `BatchMode=0`；性能测量前确认 `BatchMode` 值 | 关闭 shadow 分支 |
| R4 | **批机制本身成新开销**（虚调用/分配） | 适配层开销 >3%；PERF 配对 >1.05 | `BatchSink` 用具体类型去虚化；批对象/状态复用；profile 对比 focus 桶 | WP-0 revert 或只保留接口不加批 |
| R5 | **删除风暴 import 断裂**（408 文件、424 引用） | xl_build/tsc 报缺失 | 先 D-a 移算法，再 D-b 逐族，再 D-d 死桩（零引用），D-c 共享协议最后；每 20–40 文件一批 | 按批 commit 单独 revert |
| R6 | **跨包写范围冲突** | merger 报冲突 | §6.2 互斥表 + 契约冻结规则 + merger 不手工解冲突、退回 owner rebase | 后合并包 rebase 后重合 |
| R7 | **语句状态机直译错**（漏分支 / O(n²) 转移 / AST 差） | ORACLE 不一致；STMT 斜率 ≥2.6 | 13 组 `Scan*` 逐分支对照表；oracle 差分；保留 scanner；INV-2 断言 | WP-2 revert（scanner 未改语义） |
| R8 | **恢复形漂移**（删 throw 后行为变化） | BD recovery 16/16 或恢复形探针 10/10 红 | `RecoverItem` 三出口 + `RecordDiagnostic` 不抛；raw 回退；逐族恢复探针 | 该族 revert |
| R9 | **合并门禁 flaky**（并发/GC） | 单次 PERF >5% 但配对 <5% | gates §5 协议：3 轮中位、同轮配对、空时段复测；**最终验收必须无并发** | 不开新包，串行复测 |
| R10 | **statement-scaling 不可用**导致性能验收缺一条 | 脚本仍崩 | WP-2 修复；否则用手写长语句语料 + class-scaling + parse-perf 替代并记录；Lead 裁决 | 不影响代码合并，只影响验收证据 |
| R11 | **premature 优化**（有人顺手改语义） | AST 差 / XML 差 | 只允许逐字搬移；判据「行为零变化」；PR/commit review 由 merger 把关 | 单 commit revert |

**全局回滚锚点**：`baseline-build`（main 构建产物，不动）、`set/baseline-perf.json`（只读参考）、每个 `merge/WP-n-seq` tag、
首次 `refactor-integration` 创建 commit。任何时刻可回到上一个绿点。

---

## 11. 附录

### 11.1 新文件清单（WP-0..WP-6，约 22 个）

```
core/syntax/batch/basic-token-batch.xl.md
core/syntax/batch/batch-states.xl.md
core/syntax/batch/i-batch-host.xl.md
core/syntax/batch/batch-policy.xl.md
core/syntax/batch/basic-kind.xl.md
core/syntax/batch/item-list.xl.md
core/syntax/batch/item-scan-state.xl.md
core/syntax/batch/item-state-cache.xl.md
core/syntax/batch/raw-fallback.xl.md
core/syntax/batch/handoff-request.xl.md
core/syntax/batch/legacy-batch-adapter.xl.md            (WP-7 删)
typescript/tokens/items/enum-item-rule.xl.md
typescript/tokens/items/enum-member-item-util.xl.md
typescript/tokens/items/statement-item-scan.xl.md
typescript/tokens/items/statement-item-rule.xl.md
typescript/tokens/items/root-item-rule.xl.md
typescript/tokens/items/source-file-tail-builder.xl.md
typescript/tokens/items/member-item-util.xl.md
typescript/tokens/items/interface-item-rule.xl.md
typescript/tokens/items/class-member-item-util.xl.md
typescript/tokens/items/class-item-rule.xl.md
typescript/tokens/items/module-item-rule.xl.md
typescript/tokens/items/clause-item-rule.xl.md
tests/body-drive/batch-split.mjs
tests/body-drive/item-oracle.mjs
docs/refactor/file-inventory.md
```

### 11.2 常用命令速查

```powershell
# 建成员（波 2/3 以集成分支为基）
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name impl-wp1 -Base refactor-integration
.\tools\new-member.ps1 -Name impl-wp2-2 -From impl-wp2 -Base impl-wp2    # 接力

# 构建（xl_build 是 agent 工具，不是 CLI；out 必须是 dist）
# xl_build(cwd="<clone>", paths=["core","typescript"], targets=["ts"], out="dist")
node .\node_modules\typescript\bin\tsc -p tsconfig.json

# 门禁
..\tools\gates.ps1 -Tier quick
..\tools\gates.ps1 -Tier standard
..\tools\gates.ps1 -Tier full -BaseBuild ..\baseline-build\build

# 性能（同轮配对）
node .\tests\bench\parse-perf.mjs --dts 8 --repeat 5
node .\tests\bench\class-scaling.mjs --build build --base ..\baseline-build\build --rounds 15
node .\tests\bench\statement-scaling.mjs --rounds 15 --base ..\baseline-build\build
```

### 11.3 术语

- **批次**：宿主 `Data` 上连续一段已闭合 basic token 的零拷贝视图（`BasicTokenBatch`）。
- **item**：一个完整的成员 / 一条语句 / 根级一条声明 / 一个 specifier。
- **raw fallback**：未完成 item 的连续 raw unit 包成临时视图交既有 `BuildMembers`/`BuildStatement` 逐条重建。
- **shadow**：同一批 token 新旧两路都跑、比较结果、丢弃新结果（仅测试构建）。
- **混合模式**：某形态仍走 legacy 目录、其它形态走新引擎（**仅工作分支允许**；最终集成必须全删 possible 层，见 OPEN-Q2）。
