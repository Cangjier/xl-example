// xl:title (function () { class A { } class B extends A { constructor() { super(); super.x = 1; } } return new B().x; })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { } class B extends A { constructor() { super(); super.x = 1; } } return new B().x; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
