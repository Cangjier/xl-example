// xl:title (function () { const o = { f: function () { return this.v; }, v: 4 }; return o.f.call(o); })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { f: function () { return this.v; }, v: 4 }; return o.f.call(o); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
