// xl:title 模板字面量：多行 / 嵌套调用 / 表达式里再模板
// xl:judge stdout
// xl:end

const n = 3;
const multi = `a
b${n}`;
const nested = `outer ${`inner ${n * 2}`} end`;
const inExpr = `${n > 2 ? `big:${n}` : "small"}`;
console.log(multi, nested, inExpr, multi.length);
