// xl:title (function () { class A { } class B extends A { } return Object.getPrototypeOf(B) === A; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { } class B extends A { } return Object.getPrototypeOf(B) === A; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
