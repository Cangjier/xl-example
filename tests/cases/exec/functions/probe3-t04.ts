// xl:title (function () { function f() { return typeof this; } return f.call("x"); })()
// xl:round 692
// xl:judge stdout
// xl:want differ
// xl:why 同 `probe3-t03`（`f.call("x")` 要给**字符串包装对象**）。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { function f() { return typeof this; } return f.call("x"); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
