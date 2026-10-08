// xl:note 自我引用的递归类型别名
// xl:expect TypeAssign,TypeDefine,TypeLiteral,TypeLiteralBody
type Json = string | number | Json[] | { [k: string]: Json }
