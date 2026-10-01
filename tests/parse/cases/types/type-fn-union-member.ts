// xl:note 函数类型作为联合成员
// xl:expect TypeAssign,FunctionType,TypeDefine,Keyword
type X = string | ((a: number) => void)
