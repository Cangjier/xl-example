// xl:title Array.prototype.slice.call({ length: 3, 0: "a", 1: "b", 2: "c" }).join(",")
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Array.prototype.slice.call({ length: 3, 0: "a", 1: "b", 2: "c" }).join(",")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
