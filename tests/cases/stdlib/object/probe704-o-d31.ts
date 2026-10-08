// xl:title (function () { const o = {a:1}; Object.freeze(o); o.a = 2; return o.a; })()
// xl:round 704
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = {a:1}; Object.freeze(o); o.a = 2; return o.a; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
