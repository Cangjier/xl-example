// xl:note 映射类型的键里嵌套类型：`[K in keyof any[]]` 的内核要成形（第 66 轮）
// xl:expect MappedType,ArrayType,TypeOperator,LiteralType
type M = { [K in keyof any[]]: 1 }
