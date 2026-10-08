// xl:title Object.entries({ x: 1, y: 2 }).map((e) => e.join(":")).join(",")
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.entries({ x: 1, y: 2 }).map((e) => e.join(":")).join(",")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
