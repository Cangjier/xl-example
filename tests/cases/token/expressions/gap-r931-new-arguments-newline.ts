// xl:note `new` 的实参表在下一行（第 931 轮片段普查量出）：`new Error` 换行 `("x")` 与
// `new C<T>` 换行 `(x)` 在 TS 那边都是**一条** `NewExpression`（实参表跨过那个换行），
// 而产物把 `(…)` 当成对刚收好的 `NewExpression` 的又一次调用
// ⇒ 漂移一条 `NewExpression` + 多一条 `CallExpression`（各 2 格）。
// 这与第 905 轮收掉的 `new` 换行 `<B>()` 同一族：那一格跨的只是**类型实参表**。
// xl:known-gap `new` 收实参表那一格只看紧邻，没有跨换行
function f() { throw new Error
("x"); }
const a = new C<T>
(x);
