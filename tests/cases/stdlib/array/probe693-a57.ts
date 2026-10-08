// xl:title [["a", 1], ["b", 2]].map((p) => p[0]).join("")
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show([["a", 1], ["b", 2]].map((p) => p[0]).join("")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
