// xl:note 泛型实例化表达式独立成一条语句
// 第 850 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// `f<string>;` 里 `<…>` 退回裸符号、投影读成 `BinaryOperator(f < string)`；
// 根因与修法见 `tests/cases/token/expressions/expr-generic-instantiation.ts`。
// xl:expect GenericType,TypeParameter
declare function f<T>(): T
f<string>;
