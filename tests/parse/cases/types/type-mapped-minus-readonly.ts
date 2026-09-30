// xl:note 映射类型的 -readonly 与 +? 修饰符
// xl:expect TypeAssign,Keyword,TypeLiteral,TypeLiteralBody
type X = { -readonly [K in keyof T]+?: T[K] }
