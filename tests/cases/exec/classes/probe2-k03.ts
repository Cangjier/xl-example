// xl:title (function () { class A { constructor(x) { this.x = x; } } class B extends A {} return new B(5).x; })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { constructor(x) { this.x = x; } } class B extends A {} return new B(5).x; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
