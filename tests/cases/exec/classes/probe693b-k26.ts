// xl:title (function () { class A { m() { return 1; } } return Object.getOwnPropertyNames(A.prototype).sort().join(","); })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { m() { return 1; } } return Object.getOwnPropertyNames(A.prototype).sort().join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
