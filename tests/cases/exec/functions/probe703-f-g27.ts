// xl:title Object.getOwnPropertyNames(function f() {}).length
// xl:round 703
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.getOwnPropertyNames(function f() {}).length));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
