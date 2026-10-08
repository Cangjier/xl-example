// xl:title (function () { const o = { a: 1 }; const p = { a: 2, ...o }; return p.a; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { a: 1 }; const p = { a: 2, ...o }; return p.a; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
