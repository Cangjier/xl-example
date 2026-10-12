// xl:note 函数表达式后面直接接运算符
// xl:expect Function,FunctionBody,BinaryOperator
// 第 692 轮收编：`IsOperand` 原来不认 `Function`（只认 `Class`），于是 `+` 被读成
// **前缀一元** ⇒ 这一格是一元的操作数、投影出去的是 `FunctionDeclaration` + `UnaryOperator`。
// 补上之后与 `typeof function () {}` / `!function () {}` 一起转绿。
const r20 = function f() {} + 1;
