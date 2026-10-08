// xl:title (function () { const o = Object.freeze({ a: 1 }); return [delete o.a, o.a].join("|"); })()
// xl:round 698
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = Object.freeze({ a: 1 }); return [delete o.a, o.a].join("|"); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
