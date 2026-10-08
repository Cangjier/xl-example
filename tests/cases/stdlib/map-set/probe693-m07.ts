// xl:title [...new Map([["a", 1]])].map((p) => p.join(":")).join(",")
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show([...new Map([["a", 1]])].map((p) => p.join(":")).join(",")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
