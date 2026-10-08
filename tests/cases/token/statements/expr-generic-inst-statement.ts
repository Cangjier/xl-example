// xl:note 泛型实例化表达式独立成一条语句
// xl:known-gap 没有这条规则：产物是 `BinaryOperator(f < string)`，TS 是 `ExpressionWithTypeArguments`（r663 探针池 c-generic-inst）
// xl:expect GenericType,TypeParameter
declare function f<T>(): T
f<string>;
