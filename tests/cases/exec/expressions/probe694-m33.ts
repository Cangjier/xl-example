// xl:title (function () { const f = function () { return function () { this.x = 5; }; }; return new (f())().x; })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const f = function () { return function () { this.x = 5; }; }; return new (f())().x; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
