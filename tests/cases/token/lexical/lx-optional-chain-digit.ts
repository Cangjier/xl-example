// xl:note `?.` 后随 0-9 一律不合并：`a?.5:b` / `a?.1:b` / `a?.9:b` / `a?.5e3:b` 都是条件表达式；
// 可选链 `a?.b` / `a?.[k]` / `a?.(y)` 仍是 PropertyAccess / ElementAccess / Call + QuestionDotToken。
// xl:expect Let,TernaryOperator,PropertyAccess
// xl:absent NumericLiteral,QuestionDotToken
// xl:round cover6-E
// xl:end
const x = a?.5:b;
const y = a?.1:b;
const z = a?.9:b;
const w = a?.5e3:b;
const p = a?.b;
const q = a?.[k];
const r = a?.(y);
