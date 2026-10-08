// xl:title 解构**赋值**（不是声明）：落点是已有变量
// xl:judge stdout
// xl:end

let a = 0;
let b = 0;
({ a, b } = { a: 1, b: 2 });
console.log(a, b);
let xs: number[] = [];
[xs[0], xs[1]] = [7, 8];
console.log(xs.join(","));
