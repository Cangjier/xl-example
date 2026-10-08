// xl:title (function () { function f(a, b) {} return Object.getOwnPropertyNames(f).join(","); })()
// xl:round 692
// xl:judge stdout
// xl:want differ
// xl:why 函数自己的 `arguments` / `caller` 两格**没装**（`Object.getOwnPropertyNames(f)` 少这两个名字，而 JS 给 `length,name,arguments,caller,prototype`）。与 `stdlib/object/151` **同一条根**。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { function f(a, b) {} return Object.getOwnPropertyNames(f).join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
