// xl:title (function () { class A { get v() { return 1; } } return Object.keys(A.prototype).length; })()
// xl:round 695
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { get v() { return 1; } } return Object.keys(A.prototype).length; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
