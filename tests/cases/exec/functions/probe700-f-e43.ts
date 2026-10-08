// xl:title (function () { function f() { return this; } return f.apply(null) === undefined ? 'u' : typeof f.apply(null); })()
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { function f() { return this; } return f.apply(null) === undefined ? 'u' : typeof f.apply(null); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
