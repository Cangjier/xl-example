// xl:title (function () { const { a, ...r } = { a: 1, b: 2, c: 3 }; return Object.keys(r).join(","); })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const { a, ...r } = { a: 1, b: 2, c: 3 }; return Object.keys(r).join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
