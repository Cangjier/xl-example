// xl:note 约束是另一个类型参数 U extends T
// xl:expect TypeAssign,GenericType,Keyword
type X<T, U extends T> = U
