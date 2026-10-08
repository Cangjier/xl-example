// xl:title (function () { class A { } class B extends A { constructor() { super(); this.y = 1; } } return Object.keys(new B()).join(","); })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { } class B extends A { constructor() { super(); this.y = 1; } } return Object.keys(new B()).join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
