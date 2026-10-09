// xl:title 对象展开与剩余：次序是语义
// xl:round 331
// xl:judge stdout
// xl:end

const base = { a: 1, b: 2 };
const over = { b: 3, c: 4 };
const merged = { ...base, ...over };
console.log(JSON.stringify(merged));
const { a, ...rest } = merged;
console.log(a, JSON.stringify(rest));
const nested = { ...base, inner: { ...over } };
console.log(nested.inner.b, base.b);
