// token: IntersectionType
// xl:note 嵌套括号改变类型作用域：((A | B) & C)[]
// xl:expect TypeAssign
type X = ((A | B) & C)[]
