// xl:title Array.prototype.sort.call({ length: 3, 0: 3, 1: 1, 2: 2 }).join(",")
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Array.prototype.sort.call({ length: 3, 0: 3, 1: 1, 2: 2 }).join(",")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
