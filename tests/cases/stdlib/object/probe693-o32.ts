// xl:title (function () { const o = Object.create({ a: 1 }); return o.a + "," + Object.keys(o).length; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = Object.create({ a: 1 }); return o.a + "," + Object.keys(o).length; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
