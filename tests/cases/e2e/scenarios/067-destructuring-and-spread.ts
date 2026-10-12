// xl:title 解构、默认值、剩余与展开的组合
// xl:round 338
// xl:judge stdout
// xl:end

const [first = 0, ...others] = [1, 2, 3];
console.log(first, others.join(","));
const { a = 1, b: renamed = 2, ...rest } = { a: 10, c: 3, d: 4 } as any;
console.log(a, renamed, JSON.stringify(rest));
const nested = { list: [{ id: 1, tags: ["x"] }, { id: 2 }] };
const [{ id: id0, tags: [t0] = [] }, { id: id1 }] = nested.list;
console.log(id0, t0, id1);
const merged = { ...nested, extra: true };
console.log(Object.keys(merged).sort().join(","));
const nums = [0, ...[1, 2], 3];
console.log(nums.join(","), Math.max(...nums));
function sum(...xs: number[]): number { return xs.reduce((s, x) => s + x, 0); }
console.log(sum(...nums), sum(1, ...others, 10));
