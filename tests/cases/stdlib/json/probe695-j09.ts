// xl:title JSON.stringify({ get a() { return 1; } }, (k, v) => v)
// xl:round 695
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(JSON.stringify({ get a() { return 1; } }, (k, v) => v)));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
