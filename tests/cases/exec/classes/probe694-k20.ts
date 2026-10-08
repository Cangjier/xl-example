// xl:title (function () { class A { m() { } } return Object.getOwnPropertyDescriptor(A.prototype, "m").enumerable; })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { m() { } } return Object.getOwnPropertyDescriptor(A.prototype, "m").enumerable; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
