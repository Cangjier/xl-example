// xl:note `instanceof` 右边那个 `<…>` 后面跟 `+` / `-` 时的比较链结合方向（已知缺口）
// 第 894 轮登记、第 895 轮把根因量清并改写了一部分。
//
// **TS 那边**：`canFollowTypeArgumentsInExpression` 明写「配对 `>` 后面是 `<` / `>` / `+` / `-`
// 就判否」，于是 `C<D>` 不成实例化表达式、整条读成比较链。TS 的比较运算符**同级左结合**，
// 所以给的是左嵌套：`BinaryOperator(BinaryOperator(b instanceof C, <, D), >, +e)`。
//
// **本仓现在**：第 895 轮把 `IsInstanceOfTypeArgument` 那一支的接线修好了
//（它原来拿不到 `source`，而把 `source` 传下去会成环——见 `generic-type.xl.md` 那一节；
//  改成就地判据之后这一支真的会响），产物与 TS **逐 token 一致**：
// `<BinaryOperator op="instanceof"><Identifier>b</Identifier><Keyword>instanceof</Keyword>` 之后
// 是 `<BinaryOperator op=">"><BinaryOperator op="<">…`。**可结合方向相反**——
// 本仓给的是右嵌套（`>` 折在前、`<` 折在后），TS 给左嵌套。
//
// 所以缺口的读数一个字没变（漂 2 / 多 2），**登记的那一行照旧留着**：
// 下一轮要收的是「同级比较链的结合方向」，与 `instanceof` 这一支无关了。
// xl:known-gap 同级比较链折成了右嵌套（`>` 先折、`<` 后折），TS 给左嵌套
// xl:round 895
// xl:end
const a = b instanceof C<D> + e;
