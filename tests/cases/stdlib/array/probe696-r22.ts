// xl:title Array.prototype.toSorted.call({ length: 2, 0: 2, 1: 1 }).join(",")
// xl:round 696
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Array.prototype.toSorted.call({ length: 2, 0: 2, 1: 1 }).join(",")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
