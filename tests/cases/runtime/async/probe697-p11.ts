// xl:title (async function () { return await 1; })().constructor.name
// xl:round 697
// xl:judge stdout
// xl:want differ
// xl:why 同上：`(async function () { return await 1; })()` 的 `constructor.name` 在 Node 里是 `Promise`，本仓在 `.constructor` 上抛 `TypeError`。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((async function () { return await 1; })().constructor.name));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
