// xl:note `do…while` 后面还跟着一条语句
// xl:known-gap `DoWhile` 与后面那条语句仍然挤在同一个语句壳里（投影多套一层 `ExpressionStatement`）
// xl:expect DoWhile,Method
do {} while (a) b()
