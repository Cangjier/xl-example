// xl:title (function () { const o = {}; Object.defineProperty(o, "x", { get() { return 7; } }); const d = Object.getOwnPropertyDescriptor(o, "x"); return typeof d.get + "," + typeof d.set + "," + d.enumerable; })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = {}; Object.defineProperty(o, "x", { get() { return 7; } }); const d = Object.getOwnPropertyDescriptor(o, "x"); return typeof d.get + "," + typeof d.set + "," + d.enumerable; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
