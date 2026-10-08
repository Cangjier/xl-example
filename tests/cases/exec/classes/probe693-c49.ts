// xl:title (function () { let n = 0; const o = { get a() { n++; return 1; } }; return [o.a, o.a, n].join(","); })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let n = 0; const o = { get a() { n++; return 1; } }; return [o.a, o.a, n].join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
