// xl:title new Set([1, [2]].map((x) => JSON.stringify(x))).size
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(new Set([1, [2]].map((x) => JSON.stringify(x))).size));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
