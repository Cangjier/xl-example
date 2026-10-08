// xl:title 包装对象的取值与 typeof
// xl:round 623
// xl:judge stdout
// xl:end

const s = new String("ab");
const n = new Number(3);
const b = new Boolean(false);
console.log(typeof s, typeof n, typeof b, s.length, n + 1);
console.log(s === "ab", s == "ab", b ? "t" : "f", Boolean(b));
