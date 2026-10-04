// xl:note 逗号运算符：括号里 / for 的递增段 / 一串赋值（第 180 轮）
// xl:expect BinaryOperator,SymbolToken,Method,Lamda
const a = (1, 2);
let s = 0;
for (let i = 0, j = 3; i < j; i++, j--) s++;
let x = 0, y = 0;
x = 1, y = 2;
const f = () => (3, 4);
