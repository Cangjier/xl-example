// xl:note `a?.b` 换行 `c?.d` 是两条语句：空条件运算符的扫描不能跨过语句边界
// xl:expect Statement:2,NullConditionalOperator:2
a?.b
c?.d
