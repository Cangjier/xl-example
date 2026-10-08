// xl:title (function () { function f() { return this === globalThis; } return f.call(globalThis); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { function f() { return this === globalThis; } return f.call(globalThis); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
