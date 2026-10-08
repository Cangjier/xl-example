// xl:title Array.from({ length: 3 }, (v, i) => i).join(",")
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Array.from({ length: 3 }, (v, i) => i).join(",")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
