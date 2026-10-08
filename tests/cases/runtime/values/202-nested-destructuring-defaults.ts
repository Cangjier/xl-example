// xl:title 嵌套解构的缺省与 undefined 触发
// xl:round 371
// xl:judge stdout
// xl:end
const data: any = { a: { b: [{ c: 1 }] } };
const { a: { b: [{ c }] } } = data;
console.log(c);
const { x = 1, y: { z = 2 } = {}, ...rest } = { y: {}, extra: 3 } as any;
console.log(x, z, JSON.stringify(rest));
const [p = 1, [q = 2] = [], ...others] = [undefined, [], 3, 4] as any;
console.log(p, q, JSON.stringify(others));
const { m = 5 } = { m: null } as any;
console.log(m);
const swap = { first: 1, second: 2 };
({ first: swap.second, second: swap.first } = swap) as any;
console.log(swap.first, swap.second);
