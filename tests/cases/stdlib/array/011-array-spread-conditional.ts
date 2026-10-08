// xl:title 展开一个**条件表达式**（`[...cond ? a : b]`）
// xl:judge stdout
// xl:end

const xs = [1, 2];
const ys = [3];
console.log([...xs.length ? xs : ys].join(","));
console.log([...(xs.length ? xs : ys)].join(","));
