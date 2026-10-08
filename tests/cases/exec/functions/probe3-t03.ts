// xl:title (function () { function f() { return this === undefined ? "u" : typeof this; } return f.call(1); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { function f() { return this === undefined ? "u" : typeof this; } return f.call(1); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
