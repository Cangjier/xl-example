// xl:title (function () { const o = {}; Object.defineProperty(o, "a", { value: 1, configurable: true }); return delete o.a; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = {}; Object.defineProperty(o, "a", { value: 1, configurable: true }); return delete o.a; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
