// xl:title 解构赋值：成员目标 / 默认值 / 剩余 / 交换
// xl:round 7
// xl:judge stdout
// xl:end

const box: any = { a: 1, b: 2, c: 3, d: 4 };
const out: any = {};
({ a: out.first, ...out.rest } = box);
let x = 1, y = 2;
[x, y] = [y, x];
const [p = 10, , q = 30] = [1, 2];
const { m: mm = "d" } = { m: "M" } as any;
console.log(out.first, Object.keys(out.rest).join(","), x, y, p, q, mm);
