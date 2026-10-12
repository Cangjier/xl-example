// xl:note 泛型实例化表达式（TS 4.7）
// 第 850 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// `IsAllowedFollower` 在表达式位只放行 `(` ⇒ `f<string>;` 的 `<…>` 退回裸符号、
// 投影读成 `BinaryOperator(f < string)`；本轮把 `;` / `)` / `,` / `??` 补进那一档，
// 投影里再补一格「`Identifier` + `GenericType` ⇒ `ExpressionWithTypeArguments`」。
// xl:expect Let,GenericType,TypeParameter
declare function f<T>(): T
const a = f<string>;
