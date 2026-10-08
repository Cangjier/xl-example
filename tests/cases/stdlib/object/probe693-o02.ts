// xl:title Object.keys({ 10: 1, 2: 2, "01": 3 }).join(",")
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.keys({ 10: 1, 2: 2, "01": 3 }).join(",")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
