// xl:note D-generics-tuple-mapped 落点（657 审计语料）
// xl:expect Identifier:7,SymbolToken:1,Statement:5,TypeDefine:2,Bracket,Function,GenericType,Let,Parameter,ReturnType,Root,TypeParameter
// 第 850 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// `f<string>` 那一格投影成 `BinaryOperator` + `TypeReference`（MISS `ExpressionWithTypeArguments`）；
// 根因与修法见 `tests/cases/token/expressions/expr-generic-instantiation.ts`。
declare function f<T>(x: T): T;
let g = f<string>;
