// xl:note 括号操作数：`(4) / 2` 与 `a + (b)` 里的算符要成节点
//（修前 `IsOperand` 的括号判据看的是 StartBracketChar === ")" / "]"，而它只会是 ( / { / [，
//  那句是死代码；改成看 EndBracketChar 之后才成立）
// xl:expect BinaryOperator:3
const a1 = (4) / 2;
const a2 = x + (y);
const a3 = (g(1)) * 2;
