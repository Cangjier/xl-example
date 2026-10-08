// xl:title "abc".search("b")
// xl:round 693
// xl:judge stdout
// xl:want differ
// xl:why `String.prototype.search` / `match` 的实参是**字符串**时要先按 `new RegExp(串)` 转一次（JS 的口径），本仓直接拒收 ⇒ 抛 `TypeError`。与 `probe693-y31` **同一条根**，根子是 `RegExp` 整个待做。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show("abc".search("b")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
