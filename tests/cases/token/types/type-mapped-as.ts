// xl:note 映射类型的 as 键重映射（as 段本身没有对应标签）
// xl:expect TypeAssign,Keyword,GenericType,MappedType
type X = { [K in keyof T as Exclude<K, "a">]: T[K] }
