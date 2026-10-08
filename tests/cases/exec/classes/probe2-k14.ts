// xl:title (function () { class A { [1 + 1]() { return "two"; } } return new A()[2](); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { [1 + 1]() { return "two"; } } return new A()[2](); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
