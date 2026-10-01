// xl:note 构造签名类型 new (a: number) => A
// xl:expect TypeAssign,FunctionType,Keyword,TypeDefine
type X = new (a: number) => A
