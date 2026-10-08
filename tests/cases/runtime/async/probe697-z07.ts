// xl:title typeof (async function () {}).prototype
// xl:round 697
// xl:judge stdout
// xl:want differ
// xl:why `(async function () {}).prototype` 在 Node 里是 `undefined`，本仓给一个对象——`async` 函数**不该有 `prototype`**（它不可 `new`）。根子与 `p13` 同一处：`async` 函数那一层壳没做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(typeof (async function () {}).prototype));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
