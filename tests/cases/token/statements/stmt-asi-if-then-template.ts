// xl:note ASI：`if (a) {}` 之后换行以模板串开头是**下一条语句**。
// 与 `[` 那一格同一个根子：向导尾巴上是一个**开着的** `String`，
// 只归还「两端俱全」的单元会让反引号连同已经读进来的字符一起消失
// xl:expect IfSet,IfBody,String,ConstString
if (a) {}
`x`
