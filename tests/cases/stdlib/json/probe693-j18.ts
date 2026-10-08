// xl:title JSON.parse("{\"a\":1}") instanceof Object
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(JSON.parse("{\"a\":1}") instanceof Object));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
