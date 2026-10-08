// xl:title (function () { const o = {}; Object.defineProperty(o, "x", { get() { return 1; }, enumerable: true }); const seen = []; for (const k in o) seen.push(k); return seen.join(","); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = {}; Object.defineProperty(o, "x", { get() { return 1; }, enumerable: true }); const seen = []; for (const k in o) seen.push(k); return seen.join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
