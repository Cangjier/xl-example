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
// **`typeof typeof x === "string"` 不在这份语料里** ✗：比较那一趟把 `typeof` 关键字
// 当成了操作数 ✓，于是折成 `typeof (x === "string")` ✗——Node 给 `true` ✓、本仓给 `"boolean"` ✗
//（**值都变了** ✗）。根因与 `typeof -x` / `-!x` 是同一个 ✓：一元运算符的判据把
// 「运算符关键字」当成了操作数 ✓。三条都记在台账里 ✓。
console.log([!!x, - -x, typeof typeof s]);
console.log(!!x ? "yes" : "no", typeof typeof (x + 1));
