// xl:title call / apply / bind 三种调用形态
// xl:round 304
// xl:judge stdout
// xl:end

function sum(this: any, a: number, b: number) { return a + b + (this?.base ?? 0); }
const ctx = { base: 10 };
console.log(sum.call(ctx, 1, 2), sum.apply(ctx, [3, 4]));
const bound = sum.bind(ctx, 5);
console.log(bound(6), bound.length, bound.name);
