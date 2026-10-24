# HANDOFF — Stage 1 Wave 2 / T1d 表达式语句接线（WIP：基础设施 + 默认关闭）

分支 `feature/possible-statement-s1d`，基于 Wave1 合并 `8137721e`；未 push、未 merge 回 `feature/possible-statement`，`core/` 零改动。
**结论：基础设施已落地并编译通过；壳路径默认关闭（熔断），行为与 Wave1 逐位相同。** 详见 §5。

## 1. 改了什么

新增（2 个 .xl.md，xl_build 884 written / 0 error）：
- `typescript/tokens/statements/statement-route-util.xl.md`
  - `StatementRoute` None=0 / ShellPlainExpression=1 / ShellVariable=2 / Legacy=3 / ShellStatementFamily=4（Stage 4 留空）。
  - `StatementClass` 分类码（§2.3）+ `StatementRouteUtil.ClassOf`（Stage 3 用的唯一单元分类器）。
  - `StatementRouteUtil.Decide` 全函数：越界 / 首代码单元未到 / 只有 trivia → `None`（调用方不得据此 Reject）；
    let/const/var + StartsBinding → ShellVariable（绑定未到 → None，let 当标识符 → Legacy）；`export`/import/声明族/控制流族/
    async/await/yield/using → Legacy；`;`/`{` → Legacy；`(`/`[`/字面量/一元前缀符号 → ShellPlainExpression。
  - `EnableShellExpressions:bool = false` 熔断开关（默认关闭）、`EnableShellStatements:int = 0`。
- `typescript/tokens/statements/root-expression-statement-possible-shape.xl.md`
  - 只对 `Decide === ShellPlainExpression` Accept、只在首代码单元那一格 Accept（避免建完之后同一格与根终结候选重复 Accept）；
    只有 trivia 时 Uncertain（禁止 Reject，28 crash 根因）；`BuildByIndex` 与 `VariableStatementPossibleShape.BuildByIndex`
    逐字同构（搬 raw、Pos、SignIn、splice、Parent、MountedUnit、`CatalogGuide([], new StatementEndPossibleShape())`），
    `shell.Kind = StatementRoute.ShellPlainExpression`。

修改：
- `source-file-shape.xl.md`：注册新候选。
- `expression-statement-possible-shape.xl.md`：`ComputeByIndex` 顶部 +5 行路由 Reject（开关为 true 时才让位）。
- `statement-possible-shape.xl.md`：开关 true 时按 RouteUtil 判型；false 时**逐字保留** A 的内联 let/const/var 分流（legacy 双路等价）。
- `statement-end-possible-shape.xl.md`：**未改判据**（仍 Wave1 的 `ScanRoot`）；只保留「先用 CanEndStatement」的注释与原因（见 §5）。
- `docs/possible-statement-design.md`：新增 §13 回写（SourceFileEnd 的 `CanEndStatement && !IsSemicolon`、`limit:int`、
  lint allowlist、循环 import 遗留、T1d 分流口径）。

## 2. 门禁读数（默认关闭 = Wave1 基线）

| 门禁 | exit |
|---|---|
| `tsc` | 0 |
| `validate` | 0 |
| `ast-json` | 0 |
| `ast-json-diff` | 0 |
| `token-ast` | 0 |
| `real-dts` | 0 |
| `feas` | 0 |
| `insert` | 0 |
| `harness-all` | 0 |
| `double-accept` | 0 |
| `lint` | 0 |
| `perf` | 0 |


`xl_check`：884 file(s) / 0 error / 2500 warning（历史 W3102/W3103）。

## 3. harness

`stage1` / `route` 组不再 skip（能力门 `root:RootExpressionStatementPossibleShape`、`module:statement-route-util` 均满足），
壳路径关闭时两组的 AST 基线由 legacy 路径给出；`--double-accept` 冲突数与 `--lint` 结果见 `out-gates/`。

## 4. 熔断开关

`StatementRouteUtil.EnableShellExpressions = false`（默认关闭）。置 `true` 才会启用根表达式壳与 legacy 让位；
`false` 时新候选在首格 Reject、legacy 全接管。

## 5. 为什么默认关闭（实测失败与根因，下一成员的起点）

打开开关后实测：`token-ast` crash 69→76、`ast-json` 6156/6167→5968/6167、`ast-json-diff` 出现 148→210 条结构差、
`harness stage1` 出现 `表达式语句没有读完`。已定位/已修的：
1. **根候选重复 Accept**（首个根因）：候选在首格建壳后仍在根目录里，收口那一格与 `SourceFileEndPossibleShape` 同时 Accept
   → 已用「只在首代码单元 Accept」修掉（冲突从 stage1/asi 4 例降到 0 例）。
2. **legacy 双路不等价**：开关原先在 `Decide` 内部短路成 Legacy，导致 `StatementPossibleShape` 不再对 let/const/var 分流、
   与 `VariableStatementPossibleShape` 双 Accept → 已把开关下沉到各候选并保留 A 的内联分流。
3. **仍未收敛（本次未修完）**：`StatementShape.BuildFromShell` 在表达式语句上出现「没有读完」——壳收口位置（`End`）与
   表达式语句的边界不一致（`ScanRoot` 对表达式条目的 End 折算早于壳里攒下的全部代码单元），需要把 `EndPossible` 的
   收口位置改为「按 `CanEndStatement` 判界 + 只消费到该格」，而不是复用 `ScanRoot` 的 End。
4. **`CanEndStatement` 不能直接替换声明族收口**：它的 ASI 起点规则以「表达式语句」为前提，`let x = 1` ⏎ `let y` 处
   对 let 条目返回 false。因此 `StatementEndPossibleShape` 本提交保持 Wave1 判据，把切换留给 Stage 2 按语句族细分。

## 6. Stage 2 / 续做建议

- 先修 §5.3：表达式语句壳的收口位置（`EndPossible` 用 `CanEndStatement` 判界 + `End` 只作增量提示），再打开开关跑四道 AST 门。
- 打开开关后按 `stage1` → `route` → `asi` → `trivia` 分组逐个跑 `harness --all`，任何一组红即停。
- `Decide` 的 `ItemUtil.ItemStart` 现在是每格 O(k)，Stage 2 按 §8 做条目级缓存。
- 把 `CanEndExpressionAt` / `HasLineBreakBefore` 等静态辅助迁入 `StatementBoundaryUtil`，消除循环 import。