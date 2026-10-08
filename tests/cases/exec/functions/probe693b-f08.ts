// xl:title (function () { function f() { return this.v; } const g = f.bind({ v: 3 }); return g(); })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { function f() { return this.v; } const g = f.bind({ v: 3 }); return g(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
