// xl:title Object.getOwnPropertyNames(function f(a, b) {}).sort().join(",")
// xl:round 693
// xl:judge stdout
// xl:want differ
// xl:why 函数自己的 `arguments` / `caller` 两格**还没有**（JS 里每个非箭头函数都自带这两个**访问器**，松散模式读得出来、严格模式读会抛）。本仓的函数对象只有 `length` / `name` / `prototype` 三格——与 `probe693-f15` / `probe693-f23` **同一条根**。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.getOwnPropertyNames(function f(a, b) {}).sort().join(",")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
