// xl:title (function () { const m = new Map([["a", 1], ["b", 2], ["c", 3]]); m.delete("b"); return [...m].map((p) => p[0]).join(","); })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const m = new Map([["a", 1], ["b", 2], ["c", 3]]); m.delete("b"); return [...m].map((p) => p[0]).join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
