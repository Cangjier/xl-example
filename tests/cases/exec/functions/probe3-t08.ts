// xl:title (function () { const o = { v: 2 }; function f() { return this.v; } return f.call(o); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { v: 2 }; function f() { return this.v; } return f.call(o); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
