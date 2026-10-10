// xl:note 第 943 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// 尖括号类型断言的 `>` 与操作数之间**换行**时断言收不起来——`const a = <T>` 换行 `x;`
// 在 TS 那边是一整条 `TypeAssertionExpression`（断言只吃一个操作数），本仓把换行当语句边界
// ⇒ 缺 `TypeAssertionExpression` 1 + `Identifier` 1、漂 4、多 5（实测）。
// 根因：换行处那一问只判「末尾这一格还能不能结束一行」，而 `GenericType` 本身
// 「不期待操作数」（`ExpectsOperand` 问的是**词形**）⇒ 左边被判成写完了 ⇒ 收壳。
// 修法：`Statement.IsPendingAngleAssertion`（末尾是 `GenericType` 且**它前面那一格还在等
// 操作数** ⇒ 这一行没写完），挂在 `IsLineBreakIncompleteOnLeft` 上 ⇒ 解析期与收尾期同源。
// 同族四格（`typeof` / `void` / `!` / `+` 之后换行）一并转绿；`f<T>` 换行 / `Array<T>`
// 换行两档照旧不合并（它们前面是名字，与 TS 逐节点一致）。
// xl:absent TypeAssertionExpression
// xl:expect GenericType,Statement
const a = <T>
x;
const b = <T>// c
x;
