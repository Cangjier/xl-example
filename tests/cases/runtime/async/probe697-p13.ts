// xl:title (async function () {}).constructor.name
// xl:round 697
// xl:judge stdout
// xl:want differ
// xl:why `(async function () {}).constructor.name` 在 Node 里是 `AsyncFunction`，本仓给 `Function`——`async` 函数没有自己的构造器那一格（`%AsyncFunction.prototype%` 那一族整块没做）。同族的还有 `probe697-z04`（`Object.prototype.toString` 给 `[object Function]`）、`probe697-z08` / `z09`（生成器函数同理）。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((async function () {}).constructor.name));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
