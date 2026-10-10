// xl:title `?.` 后面紧跟下标那一格：下标与实参括号装在同一格 NCO 里
// xl:round 741
// xl:judge stdout
// xl:note 第 962 轮转绿（`xl:want differ` 与台账按规矩撤掉，用例留着当守卫）。
// 第 741 轮登记的形状：`?.` 后面紧跟**下标**那一格，产物是
// `[Method(o) ∋ [o, NCO([m], ())]]`——**下标括号与实参括号一起装在同一个 NCO 里**，
// 而 `chainWithOptional` 那一支只把**第一格**当成下标（`end: endOf(NCO)` 一路盖到 `()` 后面）
// 就返回 ⇒ 那次调用整格丢、`ElementAccessExpression` 的区间也漂 ⇒ **交出方法本身**。
//
// **修法**（[`print-ast-common.xl.md`](../../../../typescript/print-ast-common.xl.md)）：
// 那一支在**后面还有兄弟**时改成「下标只占第一格」——区间收在 `endOf(那个下标括号)` 上、
// 剩下的兄弟交给 `chainOnto`；而「以一次调用开头」的单元
//（`PropertyAccess([Bracket(()), ., v])`，第 692 轮那条口径）要先摊开再交，
// 否则 `chainOnto` 的循环在它上面既不是点号也不是括号 ⇒ `break` ⇒ 整段丢。
// xl:end
// 第 802 轮改名（原 `p741b-b05`）：`xl:want` / `xl:why` 与正文一字未动。
const o: any = { m() { return { v: 1 }; } };
console.log(o?.["m"]().v, o?.["m"]?.().v);
