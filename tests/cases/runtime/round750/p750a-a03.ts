// xl:title 装箱：`Object(1)` / `new Number` 的形状与 `valueOf`
// xl:round 750
// xl:judge stdout
// xl:end
const n = Object(1) as any;
console.log(typeof n, n.valueOf(), n instanceof Number, Object.prototype.toString.call(n));
const s = Object("a") as any;
console.log(typeof s, s.valueOf(), s.length, s[0]);
const b = Object(true) as any;
console.log(typeof b, b.valueOf(), b instanceof Boolean);
console.log(typeof Object(1), Object(1) + 1, Object(1) === 1);
const boxed = new Number(3);
console.log(typeof boxed, boxed + 1, boxed == 3 as any, boxed === (3 as any));
console.log(Object.keys(Object("ab") as any).join(","));
