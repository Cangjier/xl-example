// xl:title (function () { class A { get v() { return 1; } } const d = Object.getOwnPropertyDescriptor(A.prototype, "v"); return typeof d.get; })()
// xl:round 695
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { get v() { return 1; } } const d = Object.getOwnPropertyDescriptor(A.prototype, "v"); return typeof d.get; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
