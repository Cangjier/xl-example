// xl:title (function () { class A { m() { return 1; } } return new A().m() + Object.getOwnPropertyNames(A.prototype).length; })()
// xl:round 695
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { m() { return 1; } } return new A().m() + Object.getOwnPropertyNames(A.prototype).length; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
