// xl:title "abc".search("b")
// xl:round 693
// xl:judge stdout
// xl:want differ
// xl:why `String.prototype.search` / `match` 的实参是**字符串**时要先按 `new RegExp(串)` 转一次（JS 的口径），本仓直接拒收 ⇒ 抛 `TypeError`。与 `probe693-y31` **同一条根**，根子是 `RegExp` 整个待做。要做。
// xl:end
// **合并了原先逐字节相同的 2 条**（同一件事被逐批重抄的结果）：
//   · stdlib/string/probe693-y30.ts
//   · stdlib/string/probe703-s-e35.ts
// 判定点只有一个：正文那一句表达式（期望值由真 `node` 现给，打印口径钉成 `typeof:值`）。
// 被吸收的那几条的正文与本条**逐字节相同**，所以合并不改变任何判据。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show("abc".search("b")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
