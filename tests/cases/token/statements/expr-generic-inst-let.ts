// xl:note 泛型实例化表达式当 `let` 的初始化式
// xl:known-gap 同上一族（`let g = f<string>;`）：TS 是 `ExpressionWithTypeArguments`（r663 探针池 c-generic-inst-let）
// xl:expect Let,GenericType,TypeParameter
declare function f<T>(): T
let g = f<string>;
