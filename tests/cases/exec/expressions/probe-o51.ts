// xl:title 0x10 + 0o17 + 0b101 + 1_000
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(0x10 + 0o17 + 0b101 + 1_000));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
