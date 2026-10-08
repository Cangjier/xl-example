// xl:title Array.prototype.indexOf.call({ length: 2, 0: "a", 1: "b" }, "b")
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Array.prototype.indexOf.call({ length: 2, 0: "a", 1: "b" }, "b")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
