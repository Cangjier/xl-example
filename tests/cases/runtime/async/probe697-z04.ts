// xl:title Object.prototype.toString.call(async function () {})
// xl:round 697
// xl:judge stdout
// xl:want differ
// xl:why 同 `probe697-p13`：`Object.prototype.toString.call(async function () {})` 在 Node 里给 `[object AsyncFunction]`，本仓给 `[object Function]`。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.prototype.toString.call(async function () {})));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
