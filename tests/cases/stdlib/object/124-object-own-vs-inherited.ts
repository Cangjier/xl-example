// xl:title 自有 vs 继承：`hasOwnProperty` 与 `in` 在原型链上的分工
// xl:round 683
// xl:judge stdout
// xl:end
// 本条原来是 `124-object-internals`（混了四件事），按「一条用例一个判定点」收敛到一件：
// **`hasOwnProperty` 只看自有、`in` 沿原型链**——`{ inherited }` 在原型上时两问给出不同的答案。
// 另外三件各自已经有归属，所以从这里移走：
//   · 键序 → `183-object-keys-integer-order`（那边合并了同一件事的十六份）
//   · `getOwnPropertyNames(数组)` 的额外自有格 → `105-object-getownpropertynames-array`
//   · `Object.assign` 读的是取值器 → `070-object-assign-and-getters`
const o: any = Object.create({ inherited: 1 });
o.own = 2;
console.log("hasown-proto",
  Object.prototype.hasOwnProperty.call(o, "inherited") + ":" + ("inherited" in o));
console.log("hasown-own",
  Object.prototype.hasOwnProperty.call(o, "own") + ":" + ("own" in o));
// 对照：更远的原型链上也一样（`in` 一直问到链尾）
console.log("hasown-two-levels",
  Object.prototype.hasOwnProperty.call(o, "toString") + ":" + ("toString" in o));
