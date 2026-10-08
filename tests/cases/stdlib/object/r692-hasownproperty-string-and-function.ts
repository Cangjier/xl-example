// xl:title `hasOwnProperty` 在字符串与函数上要问得对
// xl:round 692
// xl:judge stdout
// xl:end
// **第 692 轮修的那一格**：这一支原来在 `self.Tag !== Object && !== Array` 上就**答假**——
// 于是 `"abc".hasOwnProperty("length")` / `"abc".hasOwnProperty(0)` 给假（JS 给真），
// 而同一个问题在 `Object.hasOwn` 那一支（第 691 轮收下字符串）**早就是真**：
// **两个答案**。现在字符串走 `getOwnPropertyDescriptor`（越界给 `undefined` ⇒ 假），
// 函数自己那两格（`length` / `name`，不住在属性表里）另认一句。
console.log("abc".hasOwnProperty("length"), "abc".hasOwnProperty(0), "abc".hasOwnProperty(3));
console.log((function (a, b) {}).hasOwnProperty("length"), (function (a, b) {}).hasOwnProperty("name"));
const o = { a: 1 };
console.log(o.hasOwnProperty("a"), o.hasOwnProperty("toString"));
console.log(Object.hasOwn("ab", 0), Object.hasOwn(1, "x"));
const s = Symbol("s");
console.log(o.hasOwnProperty(s), { [s]: 1 }.hasOwnProperty(s));
