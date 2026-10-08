// xl:title (function () { const o = { a: { b: { m() { return this === o.a.b; } } } }; return o.a.b.m(); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { a: { b: { m() { return this === o.a.b; } } } }; return o.a.b.m(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
