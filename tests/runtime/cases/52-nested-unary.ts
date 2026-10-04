// 第 166 轮：套着写的一元运算符（`typeof typeof x` / `!!x` / `- -x`）。
//
// 原来 `typeof typeof x` 折成一个 `UnaryOperator` 装着两个 `Keyword`，`x` 留在外面 ——
// 投影把第一个 `Keyword` 当操作数，投出 `TypeOfExpression > TypeOfKeyword`，
// 降级层报 `unimplemented: expression TypeOfKeyword`（整份文件进不来）。
//
// 修法与第 164 轮 `**` 的右结合同一个手法：后面那一格自己也是个一元运算符时先放过，
// 让里面那一处先折，再回来折这一处。
//
// **`typeof -x` 不在这份语料里**：里面那个 `-` 被当成二元减（判据把前面那个 `typeof`
// 关键字当成了操作数），于是同一个 `TypeOfKeyword` 又冒出来 —— 根因已经量清，记在台账里。

const x: number = 5;
const s: string = "s";

console.log(typeof typeof x, typeof typeof s, typeof typeof "lit");
console.log(!!x, !!0, !!s, !!"");

const negated = - -x;
const multiBang = !!!x;
const multiNegate = - - -x;

// **`-!x` 不在这份语料里** ✗：那是「布尔参与算术」（`-false` 是 `-0`）✓，
// 落在 `RtNeg` 那条**已经记着**的口径上 ✓（`unimplemented: arithmetic on a non-numeric operand` ✓），
// 与这一轮的 token 层修正无关 ✗。
console.log(negated, multiBang, multiNegate);
// **第 167 轮修好**：`typeof -x` 不再报 `TypeOfKeyword` ✓（那个 `-` 原来被读成二元减 ✓）。
// `typeof` / `void` / `delete` 现在都不算操作数 ✓（与一元那份判据对齐 ✓）。
console.log(typeof -x, typeof typeof -x, void -x, typeof (void -x));
console.log([!!x, - -x, typeof typeof s]);
console.log(!!x ? "yes" : "no", typeof typeof (x + 1));
