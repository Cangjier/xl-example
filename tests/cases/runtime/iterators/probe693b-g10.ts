// xl:title (function () { function* g() { let i = 0; while (i < 3) yield i++; } return [...g()].join(","); })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { function* g() { let i = 0; while (i < 3) yield i++; } return [...g()].join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
