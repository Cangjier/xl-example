// xl:title 500 个元素的 filter / map / reduce 流水线
// xl:judge stdout
// xl:end

const xs: number[] = [];
for (let i = 0; i < 500; i++) xs.push(i);
const squares = xs.filter((v) => v % 3 === 0).map((v) => v * v);
console.log(xs.length, squares.length, squares[0], squares[squares.length - 1]);
console.log(xs.reduce((a, b) => a + b, 0), squares.reduce((a, b) => a + b, 0));
