// xl:title new Set([1, 2]).has(2) + "," + new Set([1]).has("1")
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(new Set([1, 2]).has(2) + "," + new Set([1]).has("1")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
