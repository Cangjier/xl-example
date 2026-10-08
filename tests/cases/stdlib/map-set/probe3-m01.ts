// xl:title (function () { const m = new Map([[1, 2], [3, 4]]); return [...m.keys()].join(","); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const m = new Map([[1, 2], [3, 4]]); return [...m.keys()].join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
