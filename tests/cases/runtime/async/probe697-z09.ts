// xl:title Object.prototype.toString.call(function* () {})
// xl:round 697
// xl:judge stdout
// xl:want differ
// xl:why 同 `probe697-z08`：`Object.prototype.toString.call(function* () {})` 在 Node 里给 `[object GeneratorFunction]`。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.prototype.toString.call(function* () {})));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
