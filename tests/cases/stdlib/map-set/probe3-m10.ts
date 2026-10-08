// xl:title (function () { const m = new Map([[1, 2]]); return m.has(1) + "," + m.has(2); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const m = new Map([[1, 2]]); return m.has(1) + "," + m.has(2); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
