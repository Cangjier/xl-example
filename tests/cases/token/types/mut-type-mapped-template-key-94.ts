// xl:note 模板字面量类型作映射类型的键重映射
// xl:expect TypeAssign,Keyword,MappedType
type X = { [K in keyof/* c */ T as `get${K & string}`]: T[K] }
