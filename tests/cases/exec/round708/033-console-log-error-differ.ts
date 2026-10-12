// xl:title console.log 的 Error 不带栈（账）
// xl:round 708
// xl:judge stdout
// xl:want differ
// xl:why `Error.stack` 没装（本仓的 `Error` 只有 `name` / `message` / `cause` / `errors` 几格）：Node 上 `console.log(new Error("boom"))` 会**接着打整段栈**，本仓一行都不打。与台账里 `probe697-e11`（`Error.stack` 那一格）**同一条根**：要做先得定「本仓的帧信息从哪儿来」。
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(new Error("boom"));
