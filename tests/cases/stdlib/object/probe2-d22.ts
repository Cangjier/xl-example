// xl:title (function () { function f(a, b) {} return Object.getOwnPropertyNames(f).join(","); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { function f(a, b) {} return Object.getOwnPropertyNames(f).join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
