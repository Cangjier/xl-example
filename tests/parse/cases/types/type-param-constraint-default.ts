// xl:note 同时带约束与默认值的类型参数
// xl:expect TypeAssign,GenericType,Keyword,TypeLiteral,TypeLiteralBody
type X<T extends object = {}> = T
