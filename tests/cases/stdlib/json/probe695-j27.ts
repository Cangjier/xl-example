// xl:title JSON.stringify({ a: { b: 1 } }, null, 2).length > 10
// xl:round 695
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(JSON.stringify({ a: { b: 1 } }, null, 2).length > 10));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
