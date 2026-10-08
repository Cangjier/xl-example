// xl:title Array.prototype.toReversed.call({ length: 2, 0: 1, 1: 2 }).join(",")
// xl:round 696
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Array.prototype.toReversed.call({ length: 2, 0: 1, 1: 2 }).join(",")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
