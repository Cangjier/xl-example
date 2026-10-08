// xl:title 字符串相等按值（拼接 / 切片 / 字面量）
// xl:round 623
// xl:judge stdout
// xl:end

const a = "ab" + "c";
const b = "abc";
const c = "xabc".slice(1);
console.log(a === b, b === c, a === c);
console.log([a, b].indexOf("abc"), new Map([[a, 1]]).get(b));
