// xl:note 函数表达式后面直接接运算符
// xl:known-gap 函数表达式那一格收完就断，后面那个 `+ 1` 整段落成别的形状（缺 4）
// xl:expect Function,FunctionBody,UnaryOperator
const r20 = function f() {} + 1;
