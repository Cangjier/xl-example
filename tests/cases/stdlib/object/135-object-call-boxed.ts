// xl:title `Object(原始值)` 造出来的箱与 `new` 那一档给同一个标签
// xl:round 690
// xl:judge stdout
// xl:why 第 690 轮那一格是**读已经有的原值**、不是猜：`Object(1)` / `Object("a")` /
//       `Object(true)` 走的正是 `MakeBox`（与 `new Number` 那三族同一处），
//       所以它们的 `Object.prototype.toString.call` 也该给 `Number` / `String` / `Boolean`。
//       顺带钉住「箱还是对象」：`typeof` 是 `"object"`、`Object.keys` 是空（`__box` 是隐藏格）。
// xl:end
const n: any = Object(1);
const s: any = Object("a");
const b: any = Object(true);
console.log(Object.prototype.toString.call(n), Object.prototype.toString.call(s), Object.prototype.toString.call(b));
console.log(typeof n, n.valueOf(), Object.keys(n).length);
