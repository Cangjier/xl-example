// token: MappedType
// xl:note 键来源是字面量联合的映射类型
// xl:expect TypeAssign,MappedType
type X = { [K in "a" | "b"]: number }
