// xl:note 映射类型 { [K in keyof T]: T[K] }（keyof 在 Keyword 表内，in 不在）
// xl:expect TypeAssign,Keyword,TypeLiteral,TypeLiteralBody
type X = { [K in keyof T]: T[K] }
