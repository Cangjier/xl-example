// xl:note `new` 的被构造者是**下标访问**、后面还跟着实参表时（`new ns` 换行 `[a]()`），
// 下标与那对括号都属于**同一条** `NewExpression`（TS：`expression` 是 `ns[a]`、`arguments` 是 `()`）。
// 这一族与另外两种排版是**三种不同的形状**，分开它们的是「`[` 后面接不接得上一次调用」：
//   `new ns[a]()` → `NewExpression(ElementAccessExpression(ns, a))`；`new ns(a)` → 实参是 `(a)`；
//   `new ns[a]`   → `New` 只盖住 `ns`，下标挂在它**外面**。
// 第 937 轮先把下标括号从 `NewArguments` 里放了出来（`new.xl.md` 的 `PostfixIndexRunEnd` 那一族），
// 第 946 轮补上「后面接得上 `(` 时下标就是被构造者的一部分」。
// `new ns // x` 换行 `[a]()` 是同格的第二种 trivia 排版。
// xl:expect New,NewType,Identifier
const e = new ns
[a]();
const f = new ns // x
[a]();
