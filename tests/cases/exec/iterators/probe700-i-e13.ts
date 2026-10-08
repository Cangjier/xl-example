// xl:title typeof (function* () {})()[Symbol.iterator]
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(typeof (function* () {})()[Symbol.iterator]));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
