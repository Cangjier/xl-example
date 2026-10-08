// xl:title Object.prototype.toString.call(function* () {})
// xl:round 703
// xl:judge stdout
// xl:want differ
// xl:why 同 `p703f-g16`：`[object GeneratorFunction]` 那一格也要闭包上再盖一位。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.prototype.toString.call(function* () {})));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
