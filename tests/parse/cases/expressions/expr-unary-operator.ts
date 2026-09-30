// xl:note 表达式文法：一元运算符没有节点。`!flag` / `-value` / `count++` 现在只有
// `Symbol` + `Common`，AST 侧是 PrefixUnaryExpression / PostfixUnaryExpression（语料里实测 385 处）
// xl:expect UnaryOperator
const negated = !flag;
const negative = -value;
const incremented = count++;
const typeofText = typeof input;
