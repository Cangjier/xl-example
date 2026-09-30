// xl:note 表达式文法：二元运算符没有节点。`1 + 2` / `a === b` / `x << 2` 现在只有
// `Common` + `Symbol`，AST 侧是 BinaryExpression（语料里实测 3048 处）
// xl:expect BinaryOperator
// xl:absent LogicalOperator
const sum = 1 + 2;
const same = left === right;
const shifted = bits << 2;
const remainder = total % count;
