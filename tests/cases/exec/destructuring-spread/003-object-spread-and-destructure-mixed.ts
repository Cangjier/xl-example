// xl:title 对象展开与解构混用：重命名 / 默认值 / 剩余
// xl:judge stdout
// xl:end

const src = { a: 1, b: 2, c: 3, d: 4 };
const { a, b: renamed, e = 9, ...rest } = src;
console.log(a, renamed, e, JSON.stringify(rest));
const merged = { ...src, b: 20, extra: true };
console.log(JSON.stringify(merged));
const nested: any = { p: { q: { r: 5 } } };
const { p: { q: { r } } } = nested;
console.log(r);
