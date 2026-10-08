// xl:note 映射类型的键括号前面夹一条注释：第一个**实义**单元仍是 `[`、
// `[` 前面仍是成员起点。两处判据只跳软换行时都会被这条注释挡住 ⇒
// 键括号被 `TypeBracketCloseRule` 当成下标访问收走、整片映射类型投不出来
// xl:expect TypeAssign,MappedType,TypeParameter,TypeDefine
type A = { /*a*/ [K in B]: C }
