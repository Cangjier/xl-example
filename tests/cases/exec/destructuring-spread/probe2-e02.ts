// xl:title (function () { const { a, ...r } = { a: 1, b: 2, c: 3 }; return a + "|" + JSON.stringify(r); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const { a, ...r } = { a: 1, b: 2, c: 3 }; return a + "|" + JSON.stringify(r); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
