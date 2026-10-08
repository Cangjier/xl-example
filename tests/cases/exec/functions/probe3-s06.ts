// xl:title (function () { let n = 0; const f = () => { n = n + 1; return n; }; return f() + f(); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let n = 0; const f = () => { n = n + 1; return n; }; return f() + f(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
