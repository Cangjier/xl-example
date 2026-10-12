// xl:note 第 864 轮：`{` 是父括号的**第一个实义单元**时（`({` / `f({` / `[{`），也要答得出「它在表达式里」
// xl:expect ArrayLiteral,ObjectLiteral,SymbolToken
const b = ({ w: [5 | 6] });
f({ z: [3 & 4] });
const arr = [{ a: [1 | 2] }];
g(({ p: [7 ^ 8] }));
const deep = { q: [({ r: [1 | 2] })] };
