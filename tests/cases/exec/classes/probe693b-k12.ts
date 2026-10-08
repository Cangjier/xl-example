// xl:title (function () { class A { constructor(x) { this.x = x; } } class B extends A { constructor() { super(5); } } return new B().x; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { constructor(x) { this.x = x; } } class B extends A { constructor() { super(5); } } return new B().x; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
