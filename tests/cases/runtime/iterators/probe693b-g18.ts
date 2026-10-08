// xl:title (function () { function* g() { yield 1; yield 2; } let s = ""; for (const v of g()) s += v; return s; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { function* g() { yield 1; yield 2; } let s = ""; for (const v of g()) s += v; return s; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
