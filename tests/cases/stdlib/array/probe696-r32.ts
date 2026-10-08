// xl:title Array.prototype.reduce.call({ length: 2 }, (a, b) => a + b, 0)
// xl:round 696
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Array.prototype.reduce.call({ length: 2 }, (a, b) => a + b, 0)));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
