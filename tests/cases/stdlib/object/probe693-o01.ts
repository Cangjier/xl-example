// xl:title Object.keys({ b: 1, 2: 2, a: 3, 1: 4 }).join(",")
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.keys({ b: 1, 2: 2, a: 3, 1: 4 }).join(",")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
