// xl:title (({ a, b = 2 }) => a + b)({ a: 1 })
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((({ a, b = 2 }) => a + b)({ a: 1 })));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
