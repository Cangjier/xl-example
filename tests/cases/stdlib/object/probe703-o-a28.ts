// xl:title Reflect.deleteProperty({ a: 1 }, "a")
// xl:round 703
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Reflect.deleteProperty({ a: 1 }, "a")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
