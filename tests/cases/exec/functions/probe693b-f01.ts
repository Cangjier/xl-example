// xl:title (function () { const o = { m: function () { return this.v; }, v: 2 }; return o.m(); })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { m: function () { return this.v; }, v: 2 }; return o.m(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
