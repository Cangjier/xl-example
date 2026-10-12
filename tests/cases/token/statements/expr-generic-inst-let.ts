// xl:note 泛型实例化表达式当 `let` 的初始化式
// 第 850 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：同上一族（`let g = f<string>;`），
// 根因与修法见 `tests/cases/token/expressions/expr-generic-instantiation.ts`。
// xl:expect Let,GenericType,TypeParameter
declare function f<T>(): T
let g = f<string>;
