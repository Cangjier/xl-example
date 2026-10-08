// xl:title Array.prototype.at.call({ length: 3, 0: "a", 1: "b", 2: "c" }, -1)
// xl:round 696
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Array.prototype.at.call({ length: 3, 0: "a", 1: "b", 2: "c" }, -1)));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
