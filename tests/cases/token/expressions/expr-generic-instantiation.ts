// xl:note 泛型实例化表达式（TS 4.7）
// xl:known-gap 没有这条规则：产物是 `BinaryOperator(f < string)`，TS 是 `ExpressionWithTypeArguments`（缺 2 多 3）
// xl:expect Let,GenericType,TypeParameter
declare function f<T>(): T
const a = f<string>;
