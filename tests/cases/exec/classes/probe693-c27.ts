// xl:title (function () { const o = { set a(v) { this.b = v; } }; o.a = 2; return o.b + "," + Object.keys(o).join(","); })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { set a(v) { this.b = v; } }; o.a = 2; return o.b + "," + Object.keys(o).join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
