// xl:title 三族包装对象的形状：`typeof` / `valueOf` / 下标 / `Object.keys` / `JSON`
// xl:round 310
// xl:judge stdout
// xl:end

const s: any = new String("ab");
console.log(s.length, s[0], s[1], Object.keys(s).join(","));
console.log(typeof s, s.valueOf(), s.toString(), s.toUpperCase());
const n: any = new Number(5);
console.log(typeof n, n.valueOf(), n + 1, n.toFixed(1));
const b: any = new Boolean(false);
console.log(typeof b, b.valueOf(), String(b), b + "");
console.log(JSON.stringify(n), JSON.stringify(b), JSON.stringify(s));
