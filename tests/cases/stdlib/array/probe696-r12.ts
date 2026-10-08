// xl:title Array.prototype.lastIndexOf.call({ length: 2, 0: 1, 1: 1 }, 1)
// xl:round 696
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Array.prototype.lastIndexOf.call({ length: 2, 0: 1, 1: 1 }, 1)));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
