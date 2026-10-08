// xl:title (function () { const m = new Map([["a", 1]]); m.set("a", 2); return m.size + "," + m.get("a"); })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const m = new Map([["a", 1]]); m.set("a", 2); return m.size + "," + m.get("a"); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
