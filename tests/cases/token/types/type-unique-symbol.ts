// xl:note unique symbol：常量声明 + typeof 查询（unique / typeof 属于 Keyword 表）
// xl:expect TypeDefine,Keyword
declare const s: unique symbol
type X = typeof s
