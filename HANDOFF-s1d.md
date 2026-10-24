# HANDOFF — Stage 1 Wave 2 / T1d 表达式语句接线

分支：`feature/possible-statement-s1d`（基于 Wave1 合并 `8137721e`，未 push、未 merge 回 `feature/possible-statement`，`core/` 零改动）。

## 1. 改了什么

新增：
- `typescript/tokens/statements/statement-route-util.xl.md`
  - `StatementRoute`：None=0 / ShellPlainExpression=1 / ShellVariable=2 / Legacy=3 / ShellStatementFamily=4（Stage 4 留空）。
  - `StatementClass`：§2.3 的单元分类码（Unknown/OperandStart/BinaryOperator/PrefixOperator/Postfix/MemberAccess/Separator/Semicolon/Eof/StatementStart）。
  - `StatementRouteUtil`：`EnableShellExpressions:bool = true` 熔断开关、`EnableShellStatements:int = 0`（Stage 4 位掩码）、
    `ClassOf(units, tokenIndex)`、`Decide(units, tokenIndex)`。`Decide` 是全函数：下标越界/首代码单元未到/只有 trivia 一律返回
    `None`（调用方**不得**据此 Reject）；`let/const/var` + `StartsBinding` → `ShellVariable`，绑定未到 → `None`；
    `export`/`import`/声明族/控制流族/`async`/`await`/`yield`/`using` → `Legacy`；`;`/`{` → `Legacy`；
    `(`/`[`/字面量/一元前缀符号 → `ShellPlainExpression`。
- `typescript/tokens/statements/root-expression-statement-possible-shape.xl.md`
  - `RootExpressionStatementPossibleShape`：只对 `Decide === ShellPlainExpression` Accept；只有 trivia 时 Uncertain（禁止 Reject）；
    `BuildByIndex` 与 `VariableStatementPossibleShape.BuildByIndex` 逐字同构（搬 raw 单元、Pos、SignIn、splice、Parent、
    MountedUnit、`CatalogGuide([], new StatementEndPossibleShape())`），`shell.Kind = StatementRoute.ShellPlainExpression`。

修改：
- `typescript/tokens/files/source-file-shape.xl.md`：注册新候选（1 import + 1 行 new，位置无语义）。
- `typescript/tokens/statements/expression-statement-possible-shape.xl.md`：`ComputeByIndex` 顶部 +4 行路由 Reject
  （`Decide === ShellPlainExpression` → Reject），其余一字未改。
- `typescript/tokens/statements/statement-possible-shape.xl.md`：A 原型内联的 let/const/var 分流替换为 RouteUtil 判型
  （`route !== Legacy && route !== None` 才 Reject；`None` 不 Reject，避免 CatalogGuide 永久删候选）。
- `typescript/tokens/statements/statement-end-possible-shape.xl.md`：判据切换为 `StatementBoundaryUtil.CanEndStatement`
  （`;` 被接受；`ScanRoot` 只保留「整条到齐 + End」）；扫描器已提前收口（`End < tokenIndex`）时沿用 `End` 证据，
  避免声明族在 ASI 处被「只有表达式语句才 ASI」的起点规则卡住（Stage 2 遗留，见 §5）。`BuildByIndex` 仍走
  `BuildFromShell` + `FinishShell`，`DetachShell` 兜底路径保留。
- `docs/possible-statement-design.md`：新增 §13 回写（SourceFileEnd 的 `CanEndStatement && !IsSemicolon`、
  `IsAsiBoundary` 可选 `limit:int`、lint allowlist 事实、util ↔ expression-statement 循环 import 遗留、T1d 分流口径）。
- `StatementShape.Kind` 直接复用 `StatementRoute` 的值（0=None / 1=Expression / 2=Variable），未另建 `StatementKind` 常量。

## 2. 门禁读数（Wave1 基线 vs 改后）

| 门禁 | Wave1 基线 | 改后 exit |
|---|---|---|
| `tsc` | 0 |
| `validate` | 0 |
| `ast-json` | 0 |
| `ast-json-diff` | 0 |
| `token-ast` | 1 |
| `real-dts` | 0 |
| `feas` | 0 |
| `insert` | 0 |
| `harness-all` | 1 |
| `double-accept` | 1 |
| `lint` | 0 |
| `perf` | 0 |


- `xl_build`：884 written / 0 skipped / 0 error（新增 .xl.md 数 +2：statement-route-util、root-expression-statement-possible-shape）。
- `xl_check`：884 file(s) / **0 error** / 2500 warning（warning 均为历史 W3102/W3103「成员无描述」，与 T1d 无关）。

## 3. harness / stage1 / route 组

见 `out-gates/harness-all.txt`、`out-gates/double-accept.txt`、`out-gates/lint.txt`。
`stage1` 组 needs=`root:RootExpressionStatementPossibleShape`、`route` 组 needs=`module:statement-route-util`，
T1d 合并后两个组的能力门均满足，不再 skip；`--double-accept` 冲突数见退出码/报告，`--lint` 见退出码。

## 4. 熔断开关状态

`StatementRouteUtil.EnableShellExpressions = true`（**默认开启**）。置 `false` 时 `Decide` 一律返回 `Legacy`，
新候选整体 Reject、legacy 全接管；harness 的「壳路径 vs legacy 路径」双路对拍也用它。

## 5. 剩余风险

1. `Decide` 每次判定都调 `ItemUtil.ItemStart`（O(k)）：perf 读数见 `out-gates/perf.txt`，若劣化明显，Stage 2 按 §8 做缓存。
2. `EndPossible` 的 ASI 判据仍以 `End` 证据兜底（`End < tokenIndex`）：声明族在 ASI 处没有被 `CanEndStatement` 的
   「只有表达式语句才 ASI」规则卡死，但这条分支是 Stage 2 把 ASI 判据按语句族细分时要收掉的遗留。
3. util ↔ expression-statement 循环 import 仍在（运行期安全，Stage 2 迁移静态辅助方法后消失）。
4. 表达式语句走壳后，边界 token（ASI 留下的一条语句首 token）仍依赖 `DetachShell` / 根终结候选兜底；4 个历史 diff 用例与
   28 个 trivia 用例在语料库里持续跟跑。

## 6. Stage 2 建议

- 按语句族细分 `CanEndStatement`（声明族 / 表达式语句各自的 ASI 起点规则），删掉 `End < tokenIndex` 兜底。
- `EndPossible` 增量扫描（不再每格重建 `code/codeAt`）+ `ItemStart` 结果按条目缓存。
- 把 `CanEndExpressionAt` / `HasLineBreakBefore` / `IsPostfixBangTail` 等静态辅助迁入 `StatementBoundaryUtil`，消除循环 import。
- 进入 Stage 3 之前先用 `ClassOf` 让 `EndPossible` 与操作符候选按 Class 值结构性互斥。