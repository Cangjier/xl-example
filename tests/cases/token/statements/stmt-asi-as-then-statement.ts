// xl:note `x as A` 换行之后是另一条语句：`As` 的类型扫描不能跨过语句边界
// xl:expect Statement:2,As:1
const v = x as A
y = 2
