// xl:title Array.prototype.reduce.call([1, 2, 3], (a, b) => a + b)
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Array.prototype.reduce.call([1, 2, 3], (a, b) => a + b)));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
