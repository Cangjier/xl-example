// xl:note 泛型调用的类型实参表：逗号写在**下一行开头**（`<T` 换行 `,U>(x)`）——TS 那边是一个 `CallExpression`（`T` / `U` 在它的 `typeArguments` 里），`<` 不能退回 `LessThanToken`
// xl:round 915
// xl:expect Method,GenericType,Identifier,SymbolToken
// xl:end
const g = f<T
,U>(x);
