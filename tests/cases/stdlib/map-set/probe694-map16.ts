// xl:title new Set([1, 2, 3]).has(2) + "," + new Set([1]).has(1.0)
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(new Set([1, 2, 3]).has(2) + "," + new Set([1]).has(1.0)));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
