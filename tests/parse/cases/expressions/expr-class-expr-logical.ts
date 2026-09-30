// xl:note 类表达式在 `=` 右边当逻辑运算符的左操作数
// xl:expect Let,LogicalOperator,Class,Identifier
// 与 `function () {}` 同一个缺口：`Class` 在语句边界判定里也是无条件的，
// 于是 `&& y` 被割成独立语句，逻辑运算符抛「LogicalOperator 为空」。
const v = class {} && y;
