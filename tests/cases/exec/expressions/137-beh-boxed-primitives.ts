// xl:title 盒子对象：new Number/String/Boolean 的 typeof 与 valueOf
// xl:round 678
// xl:judge stdout
// xl:why 第 690 轮**收掉了台账**：盒子缺的那一格内部标签在 `ObjectTagOf` 里补上了
//       （判据是**自有那一格 `__box` 在不在**——`MakeBox` 本来就存着那个原值，
//       所以这是读已经有的那一格，不是照原型猜）。四行现在与 node 逐字相同。
// xl:end

const n: any = new Number(3);
const s: any = new String("ab");
const b: any = new Boolean(false);
console.log(typeof n, typeof s, typeof b);
console.log(n.valueOf(), s.valueOf(), b.valueOf());
console.log(b ? "truthy" : "falsy");
console.log(Object.prototype.toString.call(n));
console.log(n + 1, s + "c");
