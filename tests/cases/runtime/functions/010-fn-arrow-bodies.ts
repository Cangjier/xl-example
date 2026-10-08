// xl:title 箭头函数的几种体：表达式、对象字面量、块
// xl:judge stdout
// xl:end

const id = (x: number) => x;
const obj = (x: number) => ({ v: x });
const blk = (x: number) => { const y = x * 2; return y; };
console.log(id(1), obj(2).v, blk(3));
const cmp = (a: number, b: number) => (a < b ? -1 : a > b ? 1 : 0);
console.log(cmp(1, 2), cmp(2, 1), cmp(2, 2));
