// xl:title (function () { class A { } class B extends A { constructor() { super(); this.b = 1; } } return new B().b; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { } class B extends A { constructor() { super(); this.b = 1; } } return new B().b; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
