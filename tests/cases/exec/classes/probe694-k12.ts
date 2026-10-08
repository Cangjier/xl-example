// xl:title (function () { class A { constructor() { this.a = 1; } } class B extends A { constructor() { super(); this.b = 2; } } return Object.keys(new B()).join(","); })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { constructor() { this.a = 1; } } class B extends A { constructor() { super(); this.b = 2; } } return Object.keys(new B()).join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
