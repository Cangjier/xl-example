// xl:title 剩余参数与展开实参
// xl:round 291
// xl:judge stdout
// xl:end

function sum(...xs: number[]) { return xs.reduce((a, b) => a + b, 0); }
console.log(sum(...[1, 2, 3]), sum(1, ...[2, 3]), Math.max(...[1, 5, 3]));
const [a, ...rest] = [1, 2, 3];
console.log(a, rest.join(","));
