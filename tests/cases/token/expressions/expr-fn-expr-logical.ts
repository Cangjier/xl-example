// xl:note 函数表达式在 `=` 右边当逻辑运算符的左操作数
// xl:expect Let,LogicalOperator,Function,Identifier
// 匿名函数（`function () {}`）是**表达式**，不是语句边界。
// 之前 `Statement.IsStatementUnit` 无条件把它当边界，往后找语句头时停在它身上，
// `&& y` 被单独收成一个 `Statement`，逻辑运算符攒不到左操作数 → 抛「LogicalOperator 为空」。
const v = function () {} && y;
