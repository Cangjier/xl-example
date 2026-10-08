// xl:title (function () { const e = new Error("m"); return e.message + "|" + e.name; })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const e = new Error("m"); return e.message + "|" + e.name; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
