// xl:title (function () { class A { static { A.v = 2; } static { A.w = A.v + 1; } } return A.w; })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { static { A.v = 2; } static { A.w = A.v + 1; } } return A.w; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
