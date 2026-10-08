// xl:title (function () { const { a, ...r } = { a: 1, b: 2 }; return r.b; })()
// xl:round 705
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const { a, ...r } = { a: 1, b: 2 }; return r.b; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
