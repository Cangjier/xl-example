// xl:note 带类型参数的构造签名（同上：类型字面量里的签名，暂不钉 Signature）
// xl:expect TypeAssign,GenericType,TypeDefine,Keyword,TypeLiteral,TypeLiteralBody
type X = { new <T>(x: T): A<T> }
