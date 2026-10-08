// xl:title (function () { class A { *g() { yield 1; } } return [...new A().g()].length; })()
// xl:round 696
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { *g() { yield 1; } } return [...new A().g()].length; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
