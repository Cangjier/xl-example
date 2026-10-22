// xl:note cover8-A：U+2028 / U+2029 是 ECMAScript 行终止符，与 LF 一样触发 ASI（cover6 已让它们成为 trivia）
// xl:expect Let,Function,FunctionBody,Identifier
const a = 1; const b = 2;
function f(){ return 1; }
a b c;
