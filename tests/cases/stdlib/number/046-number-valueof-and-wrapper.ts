// xl:title 包装对象：new Number / valueOf / ==与===
// xl:round 371
// xl:judge stdout
// xl:end
const n = new Number(5);
console.log(n.valueOf(), typeof n, n == 5 as any, n === (5 as any));
const s = new String("ab");
console.log(s.length, s.toUpperCase(), s + "", typeof s);
const b = new Boolean(false);
console.log(b.valueOf(), b ? "truthy" : "falsy", !!b, Boolean(b));
