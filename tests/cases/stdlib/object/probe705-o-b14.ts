// xl:title Object.create({ a: 1 }, { b: { value: 2 } }).b
// xl:round 705
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.create({ a: 1 }, { b: { value: 2 } }).b));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
