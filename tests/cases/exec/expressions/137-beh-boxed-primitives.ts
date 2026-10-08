// xl:title 盒子对象：new Number/String/Boolean 的 typeof 与 valueOf
// xl:round 678
// xl:judge stdout
// xl:want differ
// xl:why 盒子对象没有自己的**内部标签**：`Object.prototype.toString.call(new Number(3))` 给 `[object Object]`，该给 `[object Number]` ⇒ 盒子造出来了（`typeof` / `valueOf` / 加法都对），缺的是「这个值是哪种内建」那一格，而 `toString` 的标签表本来就是按它分档的
// xl:end

const n: any = new Number(3);
const s: any = new String("ab");
const b: any = new Boolean(false);
console.log(typeof n, typeof s, typeof b);
console.log(n.valueOf(), s.valueOf(), b.valueOf());
console.log(b ? "truthy" : "falsy");
console.log(Object.prototype.toString.call(n));
console.log(n + 1, s + "c");
