// xl:title Object.getOwnPropertyNames(function f() {}).length
// xl:round 703
// xl:judge stdout
// xl:want differ
// xl:why 函数自己的 `arguments` / `caller` 两格没装（`Object.getOwnPropertyNames(f)` 在 JS 里给 5 个名字、本仓 3 个）。与 `stdlib/object/151` / `probe2-d22` / `probe693-o06` **同一条根**。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.getOwnPropertyNames(function f() {}).length));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
