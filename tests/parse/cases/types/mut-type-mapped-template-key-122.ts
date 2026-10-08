// xl:note 模板字面量类型作映射类型的键重映射
// xl:expect TypeAssign,Keyword,MappedType
// xl:known-gap 注释夹在映射类型键的 `keyof` 周围 / `T[K]` 的 `[` 前面：映射类型或下标访问不成形（r660 探针池 mut-type-mapped-template-key-122）
type X = { [K in keyof T as `get${K & string}`]: T/* c */[K] }
