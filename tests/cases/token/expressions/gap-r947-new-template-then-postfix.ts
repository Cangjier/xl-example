// xl:note 第 947 轮（二）转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// `new` 的被构造者是**标签模板**、而模板后面**还接着后缀**时（`new A` 换行 `` `t` `` `.b`）——
// token 层把整段平铺收进 `NewType`（`[Identifier(A), String, ., Identifier(b)]`），
// 而投影那两条标签模板的判据都不成立（0b 要「**末尾**那一格是模板」、
// 0c 要「模板与后缀**已经折成**一个 `PropertyAccess`」）⇒ 剩下的 `[., b]`
// 被当成二元运算符的尾巴折成 `BinaryExpression`（实测缺 1 多 2；
// `new A[0]` 换行 `` `t${x}` `` `.b` 缺 8）。
// 修法（投影一处）：0b 的判据从「末尾那一格是模板」放宽成「**链里有一格是模板**」，
// 模板后面那一串交给 `chainOnto`（与 0c 同一段代码，不另写一份）；
// 另把**点号**补进后缀链的词表——`new A.B` 换行 `` `t` `` `.c` 那一族 27 条卡在它上面。
// xl:expect New,NewType,Identifier
const a = new A
`t`.b;
const b = new A[0]
`t${x}`.b;
const c = new A.B
`t`.c;
const d = new A
`t`();
