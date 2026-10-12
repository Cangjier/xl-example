// xl:title `"abc".search("b")`：实参是字符串时该先转 RegExp（账）
// xl:round 693
// xl:judge stdout
// xl:want differ
// xl:why `String.prototype.search` / `match` 的实参是**字符串**时要先按 `new RegExp(串)` 转一次（JS 的口径），
//        本仓直接拒收 ⇒ 抛 `TypeError`。与 `042-string-match-and-split-regex`（正则字面量进不了门那一条）
//        是**两条不同的账**：那一条卡在语法层的 `RegularExpressionLiteral`，这一条卡在**字符串实参到 RegExp
//        的那一次转换**。根子是 `RegExp` 整个待做。要做。
// xl:end
// **第 812 轮改名**：这一条原来叫 `202-abc-search-b`（名字是一个表达式而不是「测什么」），
// 按命名规范收成描述性名字，序号取域内空位；正文与台账一字未动。
// 判定点只有一个：`"abc".search("b")` 这一句在两边各给什么（JS 给 1，本仓抛 `TypeError`）。
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
