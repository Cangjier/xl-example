// xl:title (function () { return typeof arguments; })()
// xl:round 704
// xl:judge stdout
// xl:end
// **合并了原先逐字节相同的 3 条**（同一件事被逐批重抄的结果）：
//   · exec/expressions/probe704-x-b31.ts
//   · exec/functions/probe-f15.ts
//   · exec/functions/probe700-f-e20.ts
// 判定点只有一个：正文那一句表达式（期望值由真 `node` 现给，打印口径钉成 `typeof:值`）。
// 被吸收的那几条的正文与本条**逐字节相同**，所以合并不改变任何判据。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { return typeof arguments; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
