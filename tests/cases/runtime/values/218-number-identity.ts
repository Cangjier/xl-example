// xl:title 数值相等：Int32 与 Float64 两档之间的比较
// xl:round 623
// xl:judge stdout
// xl:end

const a = 3;
const b = 1.5 * 2;
console.log(a === b, Object.is(a, b), a + b);
console.log([3].includes(1.5 * 2), new Set([3]).has(1.5 * 2));
