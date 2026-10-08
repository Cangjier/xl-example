// xl:title (function () { const o = { get a() { return 1; }, b: 2 }; return [o.a, Object.keys(o).join(",")].join("|"); })()
// xl:round 698
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { get a() { return 1; }, b: 2 }; return [o.a, Object.keys(o).join(",")].join("|"); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
