// xl:note `as` 之后跟三元：`?` / `:` 不属于类型，类型在 `A` 处就结束
// xl:expect Let,TernaryOperator,TernaryOperatorCondition,As
// TypeScript 的 AST 是 `ConditionalExpression(AsExpression(…))`：
// 收进 `As` 的话三元运算符节点永远出不来。
const v = x as A ? b : c;
