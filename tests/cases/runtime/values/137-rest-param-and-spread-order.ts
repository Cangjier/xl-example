// xl:title 剩余形参与展开实参一起用（顺序不乱）
// xl:round 305
// xl:judge stdout
// xl:end

function f(a: number, ...rest: number[]): string { return a + ":" + rest.join("|"); }
const xs = [2, 3];
console.log(f(1, ...xs, 4), f(...([1, 2, 3] as number[])));
