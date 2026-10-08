// xl:title (async function () { return 1; })().constructor.name
// xl:round 697
// xl:judge stdout
// xl:want differ
// xl:why **`async` 函数的返回值不是承诺**：`(async function () { return 1; })()` 的 `constructor.name` 在 Node 里是 `Promise`，本仓在 `.constructor` 上抛 `TypeError`（那一格根本没有）。同一条的另外三格：`instanceof Promise` 假（`probe697-p04`）、`await` 那一支同族（`probe697-p11`）、`.constructor` 给 `Function`（`probe697-p13`）。**注意 `Promise.reject(1)` 那一族是好的**（`probe697-z01`…`z03` 全 pass）——缺的是 `async` 那一条尾巴。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((async function () { return 1; })().constructor.name));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
