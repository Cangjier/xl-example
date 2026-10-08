// xl:title (function () { class A { x = 1; } return Object.keys(new A()).join(","); })()
// xl:round 695
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { x = 1; } return Object.keys(new A()).join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
