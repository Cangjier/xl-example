// xl:note 带约束的类型参数 T extends string（extends 属于 Keyword 表）
// xl:expect TypeAssign,GenericType,Keyword
type X<T extends string> = T
