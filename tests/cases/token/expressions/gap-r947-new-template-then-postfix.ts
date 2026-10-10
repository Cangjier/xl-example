// xl:known-gap `new` 的被构造者是**标签模板**、而模板后面**还接着后缀**时（`new A` 换行 `` `t` `` `.b`），
// token 层把整段平铺收进了 `NewType`（`[Identifier(A), String, ., Identifier(b)]` 四格），
// 而投影那两条标签模板的判据都不成立：0b 支要求「**末尾**那一格是模板」、
// 0c 支要求「模板与后缀**已经折成**一个 `PropertyAccess`」——平铺的链里两条都不满足，
// 于是剩下的 `[., b]` 被当成二元运算符的尾巴折成了 `BinaryExpression`。
// 第 947 轮实测（`tmp/r947/gate-sweep.mjs` 之外的四个手写片段）：
//   · `new A` 换行 `` `t` `` `.b`       缺 1 漂 0 多 2（多出来的是 `BinaryExpression` + `DotToken`）
//   · `new A[0]` 换行 `` `t${x}` `` `.b` 缺 8（`TaggedTemplateExpression` 与 `TemplateExpression` 整片没投出来）
//   · `new A` 换行 `` `t` `` `()`        这一档第 947 轮已经对了（`NewExpression > TaggedTemplateExpression`）
// 修法方向记在这里：把 0b 的判据从「末尾那一格是模板」放宽成「**链里有一格是模板**」
// （模板前面那一串仍要过 `tagIsPostfixChain`），模板后面那一串交给 `chainOnto`
// ——与 0c 走同一段代码，别在 `New.PrintAst` 里再写一份。
// xl:expect New,NewType,Identifier
const a = new A
`t`.b;
const b = new A[0]
`t${x}`.b;
