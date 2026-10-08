// xl:title Array.from({ length: 2, 0: "a", 1: "b" }).join(",")
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Array.from({ length: 2, 0: "a", 1: "b" }).join(",")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
