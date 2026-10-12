// xl:title 对象展开对每个键只取一次值（含访问器）
// xl:round 8
// xl:judge stdout
// xl:end

let reads = 0;
const src = { get a() { reads++; return reads; }, b: 2 };
const copy = { ...src, ...src };
console.log(copy.a, copy.b, reads);
