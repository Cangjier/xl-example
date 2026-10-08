// xl:title Array.prototype.filter.call({ length: 3, 0: 1, 1: 2, 2: 3 }, (x) => x > 1).join(",")
// xl:round 696
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Array.prototype.filter.call({ length: 3, 0: 1, 1: 2, 2: 3 }, (x) => x > 1).join(",")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
