# T1b HANDOFF — 语句壳 / 终结候选加固（s1b-shell）

> 注：仓库根已有一份 `HANDOFF.md`（`integration/member-possible` 的合并交接，tracked），**不动它**；
> 本成员的交接写在本文件 `HANDOFF-s1b.md`。`statement-shape.xl.md` 注释里提到的「见 `HANDOFF.md`」
> 指的是原型 A 那份既有交接，与本文件并列存在。

- 分支：`feature/possible-statement-s1b`（从 `origin/feature/possible-statement` @ `e335f1fb` 切）
- 写文件：`typescript/tokens/statements/statement-shape.xl.md`、
  `typescript/tokens/statements/statement-end-possible-shape.xl.md`，以及本文件。
- 未触碰：`expression-statement-possible-shape`、`source-file*`、`statement-scanner`、`statement-possible-shape`、
  `variable-statement-possible-shape`、`core/**`（0 改动）。未 push / 未 merge / 未改主仓库。

## 1. 改动

### 1.1 `statement-shape.xl.md`

1. **新增 `field Kind:int = 0`**（设计 §1.2 / §11）：语句族标记，`0` = 未定。族常量
   （`StatementRoute.ShellVariable` 等）随 `statement-route-util.xl.md` 在 T1d 落地；本轮**只留字段与注释**，
   不定义常量、不读写、不改变任何判定。壳内目录（Stage 4/5）将据此选构件候选，不再重复语句族判型。
2. **抽出 `static method DetachShell:(shell:Token)=>bool`**（签名按 §11 冻结）：把原型 A `TryToClose` 里的
   「EOF 建不出时拆壳」逻辑原样搬成静态方法 —— raw 单元按原下标逐格退回父 `Data`、清 `parent.MountedUnit`、
   `Parent = null`、`Closed = true`。`TryToClose` 改为调用它：
   ```ts
   if (StatementShape.DetachShell(this)) {
     return CloseStates.Nothing;
   }
   ```
   返回 `bool` 表达原来的两条「拆不掉」分支（无父单元 / 壳不在父单元里），两者都落到原来的
   `return super.TryToClose(context)`。
3. **保留**所有现有保护与注释：`!this.Closed` 门槛、`LastCodeInItem >= 0`、`BuildFromShell` 用 `try/catch` 吞错、
   `FinishShell` 成功即 `Nothing`、以及「不拆壳时壳会以未建树的形状留在根里、AST 少整条语句（4 个 diff 根因）」
   这段注释（保留在调用点，`DetachShell` 文档里再写一遍拆壳理由）。

### 1.2 `statement-end-possible-shape.xl.md`

1. **新增 `class StatementEndScan`**（增量状态骨架，字段按 §8.1）：`Start` / `Checked` / `Status` / `End` /
   `Code` / `CodeAt`，放 `PossibleShapeCache`（`this.Slot()` 自己是独立槽），沿用 `StatementScan` 的「只追加」不变量。
2. **`ComputeByIndex` 改走增量状态**：不再每格重建 `code` / `codeAt` 数组；`Checked != tokenIndex + 1` 时只
   `push` 新代码单元（含 `Start` 换条目重建、`from` 回退越界的防御性清空，逐行照 `StatementScan`）。
   `ScanRoot` 仍**每格调用**（它本身就是增量友好的），`AtEOF` 的算法与旧代码逐字相同。
3. **最终判定不变**：仍是「`ScanRoot` 的 `Status == 1` 且 `End` 落在已扫代码前缀内」→ `Accept`，否则
   `Uncertain`。`End` 的折算与有效性检查在扫描那一格里烘进 `state.End`（无效 `-1`），判据
   `state.Status === 1 && state.End >= 0` 与旧式 `result.Status === 1 && result.End >= 0 && result.End < codeAt.length`
   等价。**没有**改用 `StatementBoundaryUtil.CanEndStatement`（T1a 合并后由 T1d 做）。
4. **「只有 trivia 时禁止 Reject」防御**：`state.Code.length === 0` 时显式 `return ShapeStates.Uncertain`，
   并在注释里写明根因 —— `CatalogGuide` 把 `Reject` 的候选从 `Candidates` 里**永久删除**，文件以注释开头时
   首次判定就落在只有 trivia 的那一格，`Reject` 会让整条语句无人接管（= token-ast 28 个 crash 的根因，
   对应 `VariableStatementPossibleShape` 那 5 行修复）。
5. `BuildByIndex` **未改**（仍自重算 `End`；它不进增量状态，行为逐位不变）。

## 2. 行为等价证据（门禁逐位比对基线 ≤ `e335f1fb`）

| # | 门 | 读数 | 基线 | 判 |
|---|---|---|---|---|
| 1 | `xl_build`（cwd=本目录, targets=[ts], paths=[core,typescript]） | **0 error**，881 written，2481 warnings | 0 error | ✅ |
| 2 | `xl_check`（同参数） | **0 error**，881 files，2481 warnings | 0 error | ✅ |
| 3 | `node node_modules/typescript/bin/tsc -p tsconfig.json` | exit **0** | 0 | ✅ |
| 4 | `node tests/parse/validate.mjs` | **1720 / 0** | 1720/0 | ✅ |
| 5 | `node typescript/cases/ast-json.mjs` | **6167 / 6167**（47 构造，cj-fail 0） | 6167/6167 | ✅ |
| 6 | `node typescript/cases/ast-json-diff.mjs` | 结构差 **0** / 位置差 **0** / 字段差 **0**（6167/6167 完全一致） | 0/0/0 | ✅ |
| 7 | `node typescript/cases/token-ast.mjs` | total **1716** ok **1706** crash **0** diff **0** ts-invalid **10** | 1716/1706/0/0/10 | ✅ |
| 8 | `node typescript/cases/real-dts-ast.mjs` | 226 / 226，崩溃 0，差异 0 | 226/226 | ✅ |
| 9 | `node tests/feas-operator/harness.mjs` | **6 / 6** | 6/6 | ✅ |
| 10 | `node tests/feas-operator/insert-between.test.mjs` | **9 / 9** | 9/9 | ✅ |

**warning 数 2481 = 基线**：两个文件在 `xl_check` 里的 warning 行仍是各自既有的
`W3103 # namespace has no description` + 一条 `W3102`（`statement-shape` 的 `constructor`、
`statement-end-possible-shape` 的 `ComputeByIndex`），本轮**新增的每个成员都写了说明段**
（`Kind`、`DetachShell`、`StatementEndScan` 及其 6 个字段），因此 warning 增量 = 0。
`token-ast` 的 crash **0** 是 28-crash 修复仍然有效的直接证据；`diff 0` 说明拆壳兜底未被破坏。

**抽取等价的逐项论证**（`DetachShell` vs 旧内联代码）：
- 搬走的语句**逐字**相同（`raw` 快照 → `this.Data.length = 0` → `splice(index, 1)` → 逐格
  `splice(index + at, 0, raw[at])` + `raw[at].Parent = parent` → 条件清 `MountedUnit` → `Parent = null`、
  `Closed = true`、`return Nothing`），只多了两处 `return false`（原先是「落到函数尾部的 `super.TryToClose`」）
  与一个 `shell as StatementShape` 的类型窄化（参数签名冻结为 `Token`）。
- 调用点 `try/catch` / `FinishShell` 顺序未动，因此「先试建树、建不出才拆壳」的语义不变；
  拆壳成功后 `TryToClose` 返回 `CloseStates.Nothing` 与旧代码一致。
- 证据：token-ast diff 0 / ast-json 6167 全一致 / ast-json-diff 0/0/0 —— 拆壳路径确实被这些用例走到
  （原型 A 的 4 个 diff 用例就在语料里，`diff 0` 说明兜底仍在按旧口径生效）。

## 3. `StatementEndScan` 骨架说明（T1b 只建状态与更新路径）

- 位置：`PossibleShapeCache.Values[this.Slot()]`（逐条目、`Reset` 清空）；**只放判定进度**，不放 frame 栈 /
  `Kind` / 期望状态（§8.1 的 `Share` 纪律 —— 那些属于壳的字段）。
- 不变量：`Start`（`ItemUtil.ItemStart`）变化 = 换条目 → 重建；`Checked == tokenIndex + 1` → 直接复用上一格结论；
  否则从 `Checked`（不足则 `Start`）起**只追加**新代码单元，`from > tokenIndex + 1` 才清空重扫（防御）。
- 收益：一条 n 单元语句从 O(n²) 的数组重建降到「只 push 新单元」；`ScanRoot` 仍 O(扫描)，未做进一步的
  「只有 `;`/换行才重扫」优化（§8.1 后半段，留给 Stage 2）。
- **风险窗口**：`Checked == tokenIndex + 1` 时复用 `Status/End` 而不重扫，等价的前提是同一格的 `AtEOF`
  与候选集不变（`AtEOF` 由 `owner.SourceRange` / `NextChar` 决定，随文档增长单调，同格重复判定不变）。
  这与已落地的 `StatementScan` 是同一个前提；`token-ast` / `ast-json` / `real-dts` 三层用例全绿即证据。
  若 Stage 2 出现「同格重复判定但 `AtEOF` 翻转」的新场景，在此处加一个 `AtEOF` 字段当新鲜度判据即可，
  不需要改结构。

## 4. T1d 接法（Wave 2）

1. **判据切换（T1a 合并后才做）**：把 `ComputeByIndex` 最后的
   `state.Status === 1 && state.End >= 0` 换成 `StatementBoundaryUtil.CanEndStatement(units, tokenIndex, atEof)`
   （`atEof` 用现在这段相同的算法先算出来，别新写第二份）；`state` 的增量部分保留（它只是「攒代码前缀」，
   与判据无关），或按 T1d 的实测决定是否连 `ScanRoot` 一起退役。
   要求：`catalog-guide` 的「终结候选与其它候选同时成立」仍不可能出现（壳的普通候选为空）。
2. **`BuildByIndex`**：`End` 的折算改读 `state.End`（同一槽位），删掉现在这段重扫；但**必须**保持
   「`End < code 前缀长度` 才有效、无效就退回 `tokenIndex`」的旧口径，否则 `;` 之后的边界 token 会错位。
3. **`Kind`**：根候选建壳时填 `StatementRoute.ShellVariable` 等常量（T1d 的 `statement-route-util.xl.md` 定义），
   壳内目录按 `Kind` 选构件候选；`DetachShell` 与 `FinishShell` 签名冻结，T1d **不要改**。
4. **注册**：`root-expression-statement-possible-shape` 建壳时同样要
   `shell.CatalogGuide = new CatalogGuide([], new StatementEndPossibleShape())`（照
   `VariableStatementPossibleShape.BuildByIndex:153`），否则壳没有终结候选 = 永远建不出来。
5. 合并顺序：T1a → T1b → T1d；T1b 只改这两个文件，与 T1a/T1c 的文件集不重叠（§10.1）。

## 5. 剩余风险

| # | 风险 | 现状 | 缓解 |
|---|---|---|---|
| 1 | 增量状态与「同格重判」的 `AtEOF` 前提 | 与已落地 `StatementScan` 同前提 | 三层 AST 门禁全绿；异常时加 `AtEOF` 新鲜度字段 |
| 2 | `DetachShell` 返回 `false` 时仍落到 `super.TryToClose` | 与旧代码路径一致（旧代码也是 fall through） | token-ast diff 0 / crash 0 |
| 3 | `Kind` 目前是死字段（无人写） | 设计如此（常量在 T1d） | 不改变任何判定，`xl_check` 0 error |
| 4 | `BuildByIndex` 仍在重扫（与 `ComputeByIndex` 不同步） | 本轮刻意不改，避免判据两处漂移 | T1d 一起收敛到 `state.End` |
