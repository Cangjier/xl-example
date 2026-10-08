// xl:title (function () { const o = Object.freeze({ a: 1 }); o.a = 2; return o.a; })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = Object.freeze({ a: 1 }); o.a = 2; return o.a; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
