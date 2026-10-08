// xl:title (function () { class A { constructor() { this.x = 1; } } class B extends A { constructor() { super(); this.y = 2; } } const b = new B(); return b.x + b.y; })()
// xl:round 696
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { constructor() { this.x = 1; } } class B extends A { constructor() { super(); this.y = 2; } } const b = new B(); return b.x + b.y; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
