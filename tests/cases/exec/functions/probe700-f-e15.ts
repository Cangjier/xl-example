// xl:title ({ get a() { return 3; }, set a(v) { this.v = v; } }).a
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(({ get a() { return 3; }, set a(v) { this.v = v; } }).a));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
