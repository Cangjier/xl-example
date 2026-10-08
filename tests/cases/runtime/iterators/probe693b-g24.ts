// xl:title (function () { function* g() { for (const v of [1, 2]) yield v; } return [...g()].join(","); })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { function* g() { for (const v of [1, 2]) yield v; } return [...g()].join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
