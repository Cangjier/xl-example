// xl:title (function () { const o = {}; Object.defineProperty(o, "a", { get() { return 1; }, configurable: true }); Object.defineProperty(o, "a", { value: 5 }); return o.a; })()
// xl:round 698
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = {}; Object.defineProperty(o, "a", { get() { return 1; }, configurable: true }); Object.defineProperty(o, "a", { value: 5 }); return o.a; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
