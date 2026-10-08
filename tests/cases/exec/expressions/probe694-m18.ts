// xl:title (function () { const o = { f() { return this === o; } }; const { f } = o; return f.call(o); })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { f() { return this === o; } }; const { f } = o; return f.call(o); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
