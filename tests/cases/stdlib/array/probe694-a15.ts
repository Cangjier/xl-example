// xl:title [3, 1, 2].toSorted ? "has" : "no"
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show([3, 1, 2].toSorted ? "has" : "no"));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
