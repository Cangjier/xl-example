// xl:title "abc".search("b")
// xl:round 703
// xl:judge stdout
// xl:want differ
// xl:why `"abc".search("b")` 在 JS 里先按 `new RegExp(串)` 转一次再找（给 `1`），本仓抛 `TypeError`。与 `String.prototype` 的 `match` / `matchAll` 两格（`p703s-e36` / `e37`）以及 `stdlib/string/136` / `147` **同一条根**：`RegExp` 整族待做。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show("abc".search("b")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
