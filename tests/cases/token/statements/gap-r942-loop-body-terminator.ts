// xl:known-gap 循环体的**右端那一格**在「体是一条带 `;` 的语句、而分号写在下一行」时不齐：
// `while (a) break` 换行 `;` 在 TS 那边是 `WhileStatement[0,17)`，体是
// `BreakStatement[9,17)`（**它自己一路到那个 `;` 之后**）；本仓的 `While` 停在 `break`
// 的末尾（`[0,15)`），而那个 `;` 另起一条**空 `Statement`** ⇒ 漂 1、多 1。
// `for (const x of y) continue` 换行 `;` 与 C 风格 `for` 那一档同形（`forof2n12` / `forof2l12`）。
// **根因不在这三条收尾规则里**（第 942 轮插桩实测）：它们由那个 `;` 触发，而那一刻
// **体已经成形在列表里**（`n=3 units=[while, (a), break]`），`statementStart` 跳过 trivia
// 之后是**表尾之外的 3** ⇒ 原判据（`statementStart >= units.length`）判成空体，
// `While` 于是缩到 `break` 前面。**试过的那一版撤了**：把「表尾之后还有没有实义单元」
// 补成判据之后，`endIndex` 确实退回 `break`（体不再判空），可 `tailEnd` 仍是 14、
// `owner`（宿主的 `Statement`）的 `End` 也是 14 ⇒ **一分都没动**（读数照旧 21）。
// 结论：这一格的差额在**「那个 `;` 归谁」**上——TS 把它算进**内层**语句的区间，
// 而本仓把 `;` 切进了宿主壳、`While` 借宿主的 `End` 时那一格还没到（`ownerEnd=14`）。
// **下一轮的入手处**是「`;` 到底是内层语句的终结符还是宿主壳的终结符」，
// 不是收尾规则里那三段找尾。插桩尺子见 `tmp/r939/patchw2.mjs`（未进仓）。
// xl:expect While,WhileBody,For,ForBody,Foreach,ForeachBody,Keyword
while (a) break
;
for (;;) foo()
;
for (const x of y) continue
;
