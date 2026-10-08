// xl:title async 箭头函数的构造器名
// xl:round 710
// xl:judge stdout
// xl:want differ
// xl:why **`async` 函数没有自己那一层壳**：`(async () => {}).constructor.name` 在 Node 里是 `AsyncFunction`，本仓给 `Function`。与 `runtime/async/probe697-p13` / `probe697-z04` **同一条根**（`%AsyncFunction.prototype%` 那一族整块没做）。要做。
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show((async () => {}).constructor.name)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
