// xl:title Array.prototype.map.call({ length: 2, 0: "a" }, (v) => String(v)).join("|")
// xl:round 696
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Array.prototype.map.call({ length: 2, 0: "a" }, (v) => String(v)).join("|")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
