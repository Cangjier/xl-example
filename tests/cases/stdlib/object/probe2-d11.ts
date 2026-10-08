// xl:title (function () { const o = {}; Object.defineProperty(o, "x", { value: 1, writable: false }); o.x = 2; return o.x; })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = {}; Object.defineProperty(o, "x", { value: 1, writable: false }); o.x = 2; return o.x; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
