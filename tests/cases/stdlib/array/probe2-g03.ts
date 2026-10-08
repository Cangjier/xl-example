// xl:title Array.prototype.join.call({ length: 2, 0: 1, 1: 2 }, "-")
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Array.prototype.join.call({ length: 2, 0: 1, 1: 2 }, "-")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
