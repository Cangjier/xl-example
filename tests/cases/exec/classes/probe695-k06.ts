// xl:title (function () { class A { } Object.defineProperty(A.prototype, "v", { get() { return 7; }, enumerable: false }); return new A().v; })()
// xl:round 695
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { } Object.defineProperty(A.prototype, "v", { get() { return 7; }, enumerable: false }); return new A().v; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
