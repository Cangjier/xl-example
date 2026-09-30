// xl:note 模板字面量类型作映射类型的键重映射
// xl:expect TypeAssign,Keyword,TypeLiteral,TypeLiteralBody
type X = { [K in keyof T as `get${K & string}`]: T[K] }
