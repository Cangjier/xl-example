// xl:title (function () { class A {} return A.prototype.__proto__ === Object.prototype; })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A {} return A.prototype.__proto__ === Object.prototype; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
