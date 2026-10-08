// xl:title Object.prototype.toString.call(async function () {})
// xl:round 703
// xl:judge stdout
// xl:want differ
// xl:why `Object.prototype.toString.call(async function () {})` 在 JS 里给 `[object AsyncFunction]`，本仓给 `[object Function]`：闭包上只有 `IsClass` 一位（第 613 轮），还差 async / generator 两位。与 `stdlib/console/030` **同一条根**。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.prototype.toString.call(async function () {})));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
