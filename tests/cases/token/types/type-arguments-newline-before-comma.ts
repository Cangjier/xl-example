// xl:note 类型位的类型实参表：`Map<T` 换行 `,U>`——TS 那边是一个 `TypeReference`（两个 `typeArguments`），`<` 不能退回 `LessThanToken`
// xl:round 915
// xl:expect TypeAssign,GenericType,Identifier,SymbolToken
// xl:end
type X = Map<T
,U>;
