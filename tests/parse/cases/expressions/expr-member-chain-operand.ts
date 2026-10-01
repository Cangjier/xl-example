// xl:note 成员访问链在 token 层折成一个 `PropertyAccess` 单元，运算符才拿得到**完整的**操作数。
// 原来 `options.Error !== undefined` 被劈成 `Identifier(options) . BinaryOperator(Error !== undefined)`：
// `!==` 向左右各取一格，左边拿到的是 `options`，于是点号被夹在运算符节点外面。
// xl:expect PropertyAccess:1,BinaryOperator:1
// xl:absent TernaryOperator
if (options.Error !== undefined) {
  f();
}
