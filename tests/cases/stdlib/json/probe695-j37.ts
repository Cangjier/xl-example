// xl:title JSON.parse(JSON.stringify({ get a() { return 5; } })).a
// xl:round 695
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(JSON.parse(JSON.stringify({ get a() { return 5; } })).a));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
