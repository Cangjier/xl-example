# batch 契约修正（G0–G6）— `core/syntax/batch/**`

STATUS: 已实施（引擎 + 类型面 + 宿主侧半条契约），配套单测 `tests/body-drive/batch-contract-selftest.mjs`。
授权：Lead 按 PLAN §6.2「core/syntax/batch/** 由当前已合并包 owner 在独立小提交里改」。
依据：`impl-wp2/HANDOFF.wp2.md` §阻塞级契约缺口 G0–G6 与 §最小变更建议。

## 0. 一句话

`ItemListEngine` 从「一批最多建一个 item、边扫边 splice、用 Checked 当右界」改成
「**整批消费、可连续建多个 item、批末从右向左 splice、右界 = `State.End + 1`**」；
`ItemScanState` 带 `AtEof`，`BasicTokenBatch` 带 `Cursor`，`Flush` 把未收口尾巴写进 `RawFallback`。
`IBatchHost` / `ItemRule` 的**签名一个都没改**；`BatchMode=0` 的 legacy 路径逐字未动。

## 1. 字段 / API 增量（全部新增，无删除、无改名）

| 位置 | 增量 | 谁写 | 谁读 | 对应缺口 |
|---|---|---|---|---|
| `ItemScanState` | `field AtEof:bool = false` | 引擎（`Feed` 入口从 `batch.AtEof` 赋值） | `ItemRule.Extend/Analyze` | G0 |
| `BasicTokenBatch` | `field Cursor:int = -1`；`Reset` 置 `Cursor = from` | 引擎 | 宿主（`UnitToken`） | G1/G2 |
| `ItemListEngine` | `field Built:int = 0`（累计建出数，单调） | 引擎 | 适配器（判 `Done`/`NeedMore`） | G1 |
| `ItemListEngine` | `field RawFrom:int = -1` / `field RawTo:int = -1` | 引擎（`Build` 返回 `null` 时） | 引擎 `Flush` → `RawFallback` | G6/INV-7 |
| `ItemListEngine` | `class PendingBuild { From, To, Item }` | 引擎 | 引擎 | INV-3 |
| `ItemListEngine` | 私有方法 `RecordBuild` / `ApplyBuilds` / `ItemEnd` / `Rebase` | 引擎 | 引擎 | G1–G4 |
| `UnitToken` | 私有方法 `AdvanceBatch(batch)`；`OnBasicTokenClosed` 里 `batch.AtEof = IsAtEof()`、`Done` 时改调 `AdvanceBatch` | 宿主 | 宿主 | G1/G2/G5 |

`ItemRule` 与 `IBatchHost` 的方法表**未变**（`Classify/Extend/Analyze/Build/IncludesSeparator`、
`OnBasicTokens/OnChildCreated/OnBasicTokenClosed/CloseBatch/Reset`）。

## 2. 语义前后对比

### 2.1 `Feed`（G1/G2/G3/G4/G5）

| | 修正前（WP-0 v1） | 修正后 |
|---|---|---|
| 消费量 | 建出第一个 item 就 `return`，批内剩余 unit 不再被看 | 消费 `[Cursor, To)` **全部**，批内可连续建多个 item |
| splice 时机 | 建完立刻 `splice`，后续下标全部左移、`batch.To` 失效 | 先记 `PendingBuild`，批末**从右向左** splice（INV-3） |
| 右界 | `State.Checked` | `ItemEnd()` = `State.End + 1`（`End >= 0`），否则 `Checked` |
| item 起点 | 第一个 unit（含 trivia） | 第一个**非 trivia** unit（G4） |
| 多批 | 每次从 `batch.From` 重扫 → 已消费 unit 被**重复追加** | 从 `batch.Cursor` 续喂，`Checked` 单调（INV-2） |
| EOF | 只在有新代码 unit 时 `Analyze` | `batch.AtEof` 且无新 unit 也调一次 `Analyze`（G5） |
| 下标重定位 | 无（splice 后状态即失效） | `ApplyBuilds` splice 后用 `Rebase` 把 `Start/Checked/End/LastCode/CodeAt` 映射到新坐标 |
| `Build` 的输入 | 无裁剪（`End` 之后的 lookahead 也在 `State.Code` 里） | `TrimTo(End + 1)` 先裁 `Code/CodeAt`，建造器看不到下一条 item 的 unit |

**lookahead 尾巴**：`End + 1 < Checked` 时，`[End + 1, Checked)` 的 unit 不属于本 item，
引擎把 `i` 回退到 `End + 1`，让它们被**下一条 item 重新读一次**。这是 INV-1 的唯一放宽点
（见 §4），代价是每条 item 至多 `End` 之后的 lookahead 长度（语句族通常 0–2 个 unit）。

### 2.2 `Flush`（G3/G6）

- 右界同样用 `ItemEnd()`；item 建出后 splice 的是 `[Start, End + 1)`，不再吞掉 `End + 1..Checked`。
- item 建出、`Checked > ItemEnd` 时，尾巴 `[ItemEnd, Checked)` 写进 `RawFallback`
  （`From = Start + 1`、`To = Checked - (ItemEnd - Start - 1)`，均为 **splice 后**坐标，`Reason = "incomplete"`）。
- 整条未收口 → raw 覆盖 `[Start, Checked)`（`incomplete` / `classify-failed`）。
- `Feed` 里 `Build` 返回 `null` 的区间（`RawFrom/RawTo`）在 `Flush` 一并交出（`build-null`）。
- 宿主拿到 `RawFallback` 后自己决定保留原始 unit 还是交 raw 建造器（INV-7：引擎不建 raw AST）。

### 2.3 宿主（`UnitToken`）

`OnBasicTokens` 返回 `Done` 后不再无条件 `ClearBatch()`，而是 `AdvanceBatch(batch)`：
`batch.Cursor < batch.To` → 保留尾巴（`batch.From = Cursor`，`BatchFrom = Cursor`）；否则清批。
`NeedMore` 时批次照旧保留，但下一批必须从 `batch.Cursor` 续喂（宿主不需要改，`Feed` 自己从 `Cursor` 开始）。

## 3. WP-1 / WP-2 如何消费

- **WP-2（语句表）**：`ItemRule.Extend/Analyze` 直接读 `state.AtEof` 实现 `AtEOF` 分支
  （`let/using/await/ScanToSemicolon.stopAtEof/ScanDeclarationBody/ScanSimpleSemicolon/ScanBreakOrContinue`）；
  `Analyze` 置 `state.End = state.CodeAt[codeIndex]`（**宿主下标**，不是 Code 下标）；
  `Complete(elseBody.End)` 这类「早于已读 unit」的收口不需要特殊处理，引擎按 `End + 1` 切；
  `Build` 里**不要**动 `host.Data`，splice 由引擎做。
- **WP-1（enum 成员表）**：若成员 item 的起点是 comma/trivia，G4 已保证 `Start` 跳前导 trivia；
  `IncludesSeparator` 仍由规则声明 `,`/`;` 是否进区间。
- **适配器（各族 `OnBasicTokens` 实现）**：`Feed` 前后比较 `engine.Built`；
  `Built` 增加 → `Done`（还可按需 `Reload`），否则 `NeedMore`。不要用 `host.Data` 变化判断
  （raw 回退时 Data 不变）。
- **测试**：`tests/body-drive/batch-contract-selftest.mjs` 是不依赖解析器的契约回归；
  各族接上引擎后应保持它绿（fake host / fake rule，不需要 shape）。

## 4. INV 影响（逐条）

- **INV-1 单次读**：item 自身的 unit 仍至多两次（`Classify` 一次、`Extend/Analyze` 一次）。
  **放宽**：`End` 之后的 lookahead unit 会被下一条 item 重读一次（G3 的必要代价：不重读就只能吞掉下一条）。
  尾巴长度由规则决定，语句族 ≤2；`BatchPolicy.MaxTokens` 不放大它。
- **INV-2 单调游标**：`batch.Cursor` 与 `State.Checked` 在**每条 item 内**只增；
  一条 item 收口时 `State` 复位到 `End + 1`（新 item 的游标从那里重新单调）。
- **INV-3 推迟建造 + 右向左 splice**：已实现（`PendingBuild` + `ApplyBuilds` 反向 splice）。
  注意：**建造**仍在收口时立即发生（与 legacy 逐 token 建出的时机一致），推迟的只是 `splice`。
- **INV-4 flush 代价**：空批且 `!AtEof` 时 `Feed` 只做 `Cache.End` 就返回（O(1)）。
- **INV-5 不扫 Data**：`Feed` 只扫 `[Cursor, To)`；`Rebase` 只扫本批 `PendingBuild` 与本 item 的 `CodeAt`。
- **INV-6 批次无关性**：只消费已闭合 unit；`AtEof` 走 `batch.AtEof`。cut 在 item 中间时，
  下一批从 `Cursor` 续喂，结论不变（selftest ⑥ 覆盖「跨批同一个 item」）。
- **INV-7 单建造器**：`Build` 返回 `null` → raw 记账（`build-null`），引擎不建 AST。

## 5. 未做 / 留给后续包

1. **`Reload` / shell handoff 的接线**（`HandoffRequest` 仍只有登记与深度检查）：WP-3/WP-6。
2. **`Completed` 的 `End` 语义澄清只写进文档**：`ItemScanState.End` 一律是宿主下标；
   规则若用 `Code` 下标需自己经 `CodeAt` 映射（WP-2 的 `StatementItemScan` 必须照此写）。
3. **`BatchPolicy` 未改**：它按 token 文本判软边界，不依赖本次增量。
4. **未改 `IsAtEof` 的可靠性**：`UnitToken.IsAtEof` 仍按宿主 `SourceRange.End >= Document.GetCount()`
   判定；EOF 哨兵 unit（零宽 `BasicKind.Eof`）仍是第二条信号。若 WP-2 发现 `AtEof` 在该路径上
   不成立，应作为**新缺口**报 Lead（不在本次最小集内）。
5. **未做 `Feed` 的返回值**：仍是 `void`；消费进度靠 `batch.Cursor`，建出数靠 `engine.Built`。
