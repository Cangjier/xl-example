# HANDOFF — T1d r12：保守缩小启用范围**已实现并实测，被证伪**；工作树回到 r11 原状，开关仍 false，dev 19/22

分支 `feature/possible-statement-s1d`（本目录 r12），起点 `40f0cedd`（r11）。本轮 xl_build 0 error、tsc 0 error。
**源码零改动**（全部实验已回滚，工作树与 r11 HEAD 逐字节一致），只有本文件一个 commit。

## 1. 本轮做了什么（按指派策略，逐条落地后实测）

1. 改 `statement-route-util.xl.md` 的 `Decide`（唯一改动点）：
   - 新增 `NextIsColon(units, headAt)`：首代码单元是标识符且**下一代码单元**是 `:` → `Legacy`（标签族，注释由 `NextCode` 跳过）。
   - `let`/`const`/`var` + `StartsBinding` → `Legacy`（原 `ShellVariable`），Stage 1 暂时关闭变量壳。
   - `++`/`--` Symbol → `Legacy`（原 `ShellPlainExpression`）；`! ~ + -` 维持 ShellPlainExpression。
2. 给 10 条 dev case 加 `expectRoute:"Legacy"`；`harness.mjs` 新增该字段的**取证断言**：开关 true 的 XML 必须与开关 false（legacy 基线）逐字节一致，否则 FAIL；组行新增 `routedLegacy=N`。没有把它做成「允许失败」。
3. xl_build（paths=core,typescript / target=ts）0 error；tsc 0 error；dev 组实跑。

## 2. 实测：不但没到 22/22，还从 19 掉到 18

```
[group] dev: pass=19 fail=3 skip=0 uncovered=0
[statement-possible] double-accept 冲突: 3
```

| case | 结果（开关 true、新 Decide） | 根因（实测） |
| --- | --- | --- |
| dev-label-enum-tail | FAIL `语句没有读完`（**与 r11 逐字相同**） | 标签改了路由也没用，见 §3 |
| dev-as-const-crossline-tail | FAIL `CatalogGuide: 终结候选与其它候选同时成立（宿主 SourceFileShape，下标 29）` | 变量判 Legacy 后落到 generic `StatementPossibleShape` 壳，EOF 同格 Accept |
| dev-crlf | FAIL 同上（下标 16） | **回归**：同一机制；r11 走 `ShellVariable` 是好的 |
| dev-prefix-operand-newline | FAIL 同上（下标 28） | **回归**：首条 `let` 被判 Legacy，整条文件进 generic 壳 |

三条新冲突的现场都是 `StatementPossibleShape` 与 `SourceFileEndPossibleShape` 在 EOF 同格 Accept。
6 条 routedLegacy 通过（label-asi / label-call-asi / let-as-label / label-chain / label-block /
label-comment）——**但它们在 r11 本来就通过**，换成 Legacy 只是换了条路走通，没有把任何红色转绿。

## 3. 关键机制（下一棒必须先读，能省两轮）

**`StatementRoute.Legacy` 不是 Wave1 legacy 路径。** 它是一个「根候选家族码」：

- 开关 **true** 时，根 `StatementPossibleShape` 只接 `Decide ∈ {Legacy, None}`，而它自己就是
  `StatementShape` 壳 + `StatementScanner`/`StatementBuilder`（新路径）；`VariableStatementPossibleShape`
  只接 `ShellVariable`，`RootExpressionStatementPossibleShape` 只接 `ShellPlainExpression`。
- 开关 **false** 时才是 Wave1：`StatementPossibleShape.ComputeByIndex` 走 `else` 分支的**内联分流**
  （只把 `let/const/var + StartsBinding` 推给 `VariableStatementPossibleShape`），内层语句目录里
  `ExpressionStatementPossibleShape` 也按同一 `Decide` 让位。**内层候选同样读 `Decide`**：一旦把标签判成
  `Legacy`，内层表达式语句候选就 `Reject`，根层 `StatementPossibleShape` 接了标签却没人建得出来 →
  `语句没有读完`。把变量判成 `Legacy`，则 `VariableStatementPossibleShape`（只认 `ShellVariable`）让位、
  变量落进 generic 壳 → EOF 冲突。

结论：**per-statement 的 `Decide=Legacy` 无法把某一条语句「送回 Wave1」**；Wave1 是开关 false 时
*整条文件*的候选目录行为，不是某一个 route 码。因此「保守缩小启用范围让三条红根本不进新路径」这条路
在本架构下不成立——三条红是建树/收口问题（r11 已排除 ASI 断句），不是路由问题。

## 4. 本轮排除的假设（确定性结论）

1. 三条红不是「没进新路径」：路由切到 Legacy 后结局不变（label）或变成冲突（变量），没有一条转绿。
2. `Decide` 的所有分支在开关 true/false 下语义不同；改 `Decide` **不会**在 false 态回归（false 态
   `ExpressionStatementPossibleShape` 的门控是 `EnableShellExpressions && ...`，已核对源码），但这不改变
   「Legacy ≠ Wave1」的结论。
3. harness 的 `expectRoute` 取证是对的：它证明「开关 true 与 legacy 基线一致」，但它管不住「这条语句
   到底由谁建」——6 条通过项恰好是两边都能建对的形态。

## 5. 建议 r13 的两条路线（按代价排序）

- **A. 文件级 fallback（推荐先试）**：在 `SourceFileShape` 层判定——若首代码单元的 `Decide` 不是
  `ShellPlainExpression`（或扫描中任一语句被判 Legacy/ShellVariable 而该族未实现），**整条文件**按
  `EnableShellExpressions=false` 的候选目录解析。这才是真正的 Wave1 兜底；实现点应在根目录创建/门控，
  不要动 `IsAsiBoundary`（legacy 共用）。
- **B. 修三处建树**：`StatementBuilder.BuildStatement` 的段内收口；`en:` 标签+块+无分号 enum 的尾段；
  `as T` ⏎ `(` 的类型断言收尾；前缀 `--` 跨行。入口与 r11 §2 一致，但注意内层 `Decide` 门控。

## 6. 全表读数

源码与 r11 HEAD 逐字节一致，**未重跑**全表；r11 已实测 false 态全绿（ast-json 6167/6167、diff 0/0/0、
token-ast 1706/0/10、real-dts 226/226、validate 1720/0、harness --all 72/0/known1、double-accept 0、
lint PASS）。本轮实验态的 true 读数不具参考价值（dev 未过），不再记录。

## 7. 开关最终值

`StatementRouteUtil.EnableShellExpressions = false`（**未改**；实验中的临时 true 已随回滚消失）。

## 8. dev 组最终

[group] dev: pass=18 fail=4 skip=0 uncovered=0

三条红（label-enum-tail / as-const-crossline-tail / prefix-operand-newline）与 r10/r11 逐字一致，未转绿。

> 生成物说明：`dist/ts/**` 被 gitignore（不属于提交内容），本轮实验后用 xl_build 从回滚后的 `.xl.md` 重新生成，tsc 重建 `build/ts`；`git status` 干净。

## 9. 剩余风险与预算

- 净零进展（0 条修好），但产出一条**确定性排除**：路由收缩不是三条红的解法；`Legacy` 码不等于 Wave1，
  内层候选也读 `Decide`。
- 本轮工具调用 10 轮（上限 10）；未提交任何实验代码，工作树干净。