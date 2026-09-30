// xl:note keyof typeof 组合查询
// xl:expect TypeAssign,TypeDefine,Keyword,TypeLiteral,TypeLiteralBody
declare const obj: { a: number }
type X = keyof typeof obj
