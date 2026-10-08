// xl:title [...Array.prototype.entries.call({ length: 1, 0: "a" })].map((e) => e.join(":")).join(",")
// xl:round 696
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show([...Array.prototype.entries.call({ length: 1, 0: "a" })].map((e) => e.join(":")).join(",")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
