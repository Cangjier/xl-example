// xl:title Object.getOwnPropertyDescriptor({ a: 1 }, "b") === undefined
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.getOwnPropertyDescriptor({ a: 1 }, "b") === undefined));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
