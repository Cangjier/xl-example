// xl:title (function () { try { undefinedFn(); } catch (e) { return e.constructor.name; } })()
// xl:round 701
// xl:judge stdout
// xl:want blocked
// xl:why **没声明过的名字**在**降级期**就抛（`name is not a local or a capture: undefinedFn`），而 JS 要到**运行期**才抛 `ReferenceError`（`try { undefinedFn(); } catch (e) { e.constructor.name }` 该给 `"ReferenceError"`）。与台账里第 692 轮登记的那一条**同一条根**（降级层不做「运行期查名字」那一档）。要做。
// xl:end
// **合并了原先逐字节相同的 2 条**（同一件事被逐批重抄的结果）：
//   · exec/statements/probe701-c-e17.ts
//   · stdlib/error/probe697-e17.ts
// 判定点只有一个：正文那一句表达式（期望值由真 `node` 现给，打印口径钉成 `typeof:值`）。
// 被吸收的那几条的正文与本条**逐字节相同**，所以合并不改变任何判据。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { try { undefinedFn(); } catch (e) { return e.constructor.name; } })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
