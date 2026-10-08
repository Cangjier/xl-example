// xl:title (function () { function f() { return this; } const b = f.bind("s"); return typeof b(); })()
// xl:round 692
// xl:judge stdout
// xl:want differ
// xl:why 同 `probe3-t03`（`bind` 出来的函数被调用时同样要装箱）。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { function f() { return this; } const b = f.bind("s"); return typeof b(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
