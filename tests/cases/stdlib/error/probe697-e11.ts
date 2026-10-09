// xl:title typeof new Error("m").stack
// xl:round 697
// xl:judge stdout
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(typeof new Error("m").stack));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
