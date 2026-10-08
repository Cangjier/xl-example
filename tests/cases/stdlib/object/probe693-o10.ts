// xl:title Object.assign({}, { a: 1 }, { b: 2 }).b
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.assign({}, { a: 1 }, { b: 2 }).b));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
