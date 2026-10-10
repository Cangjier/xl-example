// xl:note 第 944 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// 循环体的**右端那一格**在「体是一条带 `;` 的语句、而分号写在下一行」时不齐——
// `while (a) break` 换行 `;` 在 TS 那边是 `WhileStatement[0,17)`、体是 `BreakStatement[9,17)`
//（**它自己一路到那个 `;` 之后**），本仓的 `While` 停在 `break` 的末尾（`[0,15)`）
// ⇒ 漂 1、多 1（`for (const x of y) continue` 换行 `;` 与 C 风格 `for` 那一档同形）。
// 根因不在收尾规则里（第 942 轮插桩实测），而在**那个 `;` 归谁**：收壳之后它落进
// **另一条空壳**，外层壳的右端于是不覆盖它，`While` 借宿主右端时借不到那一格。
// 第 944 轮的修法：`Statement.TrailingSemicolonJoins`——「下一行以 `;` 开头」时
// 换行不是语句边界（分号是**上一条语句自己的终结符**，TS 的 `canParseSemicolon`），
// 解析期与收尾期一处判据、两处成形器共用。
// xl:expect While,WhileBody,For,ForBody,Foreach,ForeachBody,Keyword
while (a) break
;
for (;;) foo()
;
for (const x of y) continue
;
