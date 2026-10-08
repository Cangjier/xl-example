// xl:title Array.prototype.with.call({ length: 2, 0: 1, 1: 2 }, 0, 9).join(",")
// xl:round 696
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Array.prototype.with.call({ length: 2, 0: 1, 1: 2 }, 0, 9).join(",")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
