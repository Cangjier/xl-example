// xl:note 函数类型作为泛型实参
// xl:expect TypeAssign,GenericType,TypeDefine,Keyword
type X = Wrap<(a: number)/* c */ => void>
