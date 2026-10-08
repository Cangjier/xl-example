// xl:title (function () { const o = { get a() { return 1; } }; return Object.assign({}, o).a; })()
// xl:round 695
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { get a() { return 1; } }; return Object.assign({}, o).a; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
