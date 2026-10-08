// xl:title (function () { let n = 0; const o = { get f() { n++; return () => 1; } }; o.f?.(); return n; })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let n = 0; const o = { get f() { n++; return () => 1; } }; o.f?.(); return n; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
