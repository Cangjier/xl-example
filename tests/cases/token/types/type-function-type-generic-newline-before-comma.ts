// xl:note 函数类型的泛型参数表：`<T` 与 `,>` 之间换行——TS 那边整条是一个 `FunctionType`（`T` 在它的 `typeParameters` 里），`<` 不能退回 `LessThanToken`
// xl:round 914
// xl:expect FunctionType,TypeParameter,GenericType,Identifier
// xl:end
type X = <T
,>(a: T) => T;
