// xl:title Object.getOwnPropertyDescriptor(function f(a) {}, "length").value
// xl:round 705
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.getOwnPropertyDescriptor(function f(a) {}, "length").value));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
