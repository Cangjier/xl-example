// xl:title (function* () {}).constructor.name
// xl:round 697
// xl:judge stdout
// xl:want differ
// xl:why 同 `probe697-p13`：`(function* () {}).constructor.name` 在 Node 里是 `GeneratorFunction`，本仓给 `Function`。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function* () {}).constructor.name));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
