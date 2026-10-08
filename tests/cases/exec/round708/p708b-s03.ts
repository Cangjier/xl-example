// xl:title search / match 的字符串实参
// xl:round 708
// xl:judge stdout
// xl:want differ
// xl:why `String.prototype.search` 的**字符串实参**要先按 `new RegExp(串)` 转一次（JS 的口径），本仓直接拒收 ⇒ 抛 `TypeError`。与 `stdlib/string/probe693-y30` / `probe703-s-e35` 以及 `String.prototype` 的 `match` / `matchAll` / `search` 三格**同一条根**：`RegExp` 整族待做。
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

run(() => { console.log(show("abc".search("b"))); });
