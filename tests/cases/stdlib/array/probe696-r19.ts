// xl:title [...Array.prototype.values.call({ length: 2, 0: "a", 1: "b" })].join(",")
// xl:round 696
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show([...Array.prototype.values.call({ length: 2, 0: "a", 1: "b" })].join(",")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
