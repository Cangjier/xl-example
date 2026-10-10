// xl:note `new` 的实参表在下一行（第 931 轮片段普查量出、**同轮收掉**）：
// `new Error` 换行 `("x")` 与 `new C<T>` 换行 `(x)` 在 TS 那边都是**一条** `NewExpression`
//（实参表可以另起一行——TS 的 parser 只问「紧跟在这一格后面的是不是 `(`」），
// 而产物把 `(…)` 当成对刚收好的 `NewExpression` 的又一次调用
// ⇒ 漂移一条 `NewExpression` + 多一条 `CallExpression`。
// **修法**：`NewCloseRule.Process` 的扫描在换行那一格原来只跨「已成形的 `GenericType`」
//（第 905 轮），这一轮把「下一格是 `(`」也跨过去；顺带把跨过的软换行从类型段的尾巴上摘掉。
// 这一份留着当守卫——它钉的是「跨过换行拿实参表」这条判据，而反例
//（`const b = new A` 换行 `const c = new B()`）在别处另有用例。
// xl:expect New:2
function f() { throw new Error
("x"); }
const a = new C<T>
(x);
