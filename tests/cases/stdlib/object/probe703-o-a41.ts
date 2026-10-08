// xl:title Object.getOwnPropertyNames(function f(a, b) {}).join(",")
// xl:round 703
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.getOwnPropertyNames(function f(a, b) {}).join(",")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
