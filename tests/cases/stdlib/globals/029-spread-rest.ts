// xl:title 展开与剩余：调用 / 数组 / 对象 / 形参
// xl:round 623
// xl:judge stdout
// xl:end

function f(a: number, ...rest: number[]) { return a + rest.length; }
console.log(f(...[1, 2, 3]));
const [x, ...ys] = [1, 2, 3];
const { p, ...qs } = { p: 1, q: 2, r: 3 };
console.log(x, ys.join(","), JSON.stringify(qs));
console.log(Math.max(...[1, 9, 3]));
