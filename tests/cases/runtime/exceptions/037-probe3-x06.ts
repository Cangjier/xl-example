// xl:title (function () { try { (1).toFixed(200); } catch (e) { return e.constructor.name; } })()
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先逐字节相同的 3 条**（同一件事被逐批重抄的结果）：
//   · runtime/exceptions/probe3-x06.ts
//   · runtime/exceptions/probe694-x18.ts
//   · stdlib/error/probe697-e08.ts
// 判定点只有一个：正文那一句表达式（期望值由真 `node` 现给，打印口径钉成 `typeof:值`）。
// 被吸收的那几条的正文与本条**逐字节相同**，所以合并不改变任何判据。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { try { (1).toFixed(200); } catch (e) { return e.constructor.name; } })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
