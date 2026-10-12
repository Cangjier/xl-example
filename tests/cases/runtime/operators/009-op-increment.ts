// xl:title 前置 / 后置 `++` `--`，落点可以是变量、成员、下标
// xl:judge stdout
// xl:end

let i = 0;
console.log(i++, i, ++i, i);
const o = { n: 5 };
console.log(o.n++, o.n, --o.n);
const xs = [1, 2];
console.log(xs[0]++, xs[0], ++xs[1]);
