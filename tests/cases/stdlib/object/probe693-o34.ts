// xl:title Object.hasOwn({ a: 1 }, "a") + "," + Object.hasOwn({ a: 1 }, "b")
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.hasOwn({ a: 1 }, "a") + "," + Object.hasOwn({ a: 1 }, "b")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
