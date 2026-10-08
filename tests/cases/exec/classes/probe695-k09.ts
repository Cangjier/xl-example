// xl:title (function () { class A { } return typeof Object.getOwnPropertyDescriptor(A.prototype, "constructor").value; })()
// xl:round 695
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { } return typeof Object.getOwnPropertyDescriptor(A.prototype, "constructor").value; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
