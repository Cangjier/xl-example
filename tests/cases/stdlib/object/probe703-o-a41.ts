// xl:title Object.getOwnPropertyNames(function f(a, b) {}).join(",")
// xl:round 703
// xl:judge stdout
// xl:want differ
// xl:why 函数自己的 `arguments` / `caller` 两格没装（与 `stdlib/object/151` **同一条根**）。与 `p703f-g27` 量的是同一件事（一个走 `Object.getOwnPropertyNames` 的个数、一个走名单）。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.getOwnPropertyNames(function f(a, b) {}).join(",")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
