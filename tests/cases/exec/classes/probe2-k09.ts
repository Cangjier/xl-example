// xl:title (function () { class A { constructor() { this.a = 1; } } return (new A()) instanceof A; })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { constructor() { this.a = 1; } } return (new A()) instanceof A; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
