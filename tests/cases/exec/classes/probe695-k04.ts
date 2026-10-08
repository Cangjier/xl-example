// xl:title (function () { class A { static set s(v) { A._s = v; } static get s() { return A._s; } } A.s = 2; return A.s; })()
// xl:round 695
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { static set s(v) { A._s = v; } static get s() { return A._s; } } A.s = 2; return A.s; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
