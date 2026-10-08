// xl:title (function () { try { undefinedFn(); } catch (e) { return e.constructor.name; } })()
// xl:round 701
// xl:judge stdout
// xl:want blocked
// xl:why **没声明过的名字**在**降级期**就抛（`name is not a local or a capture: undefinedFn`），而 JS 要到**运行期**才抛 `ReferenceError`（`try { undefinedFn(); } catch (e) { e.constructor.name }` 该给 `"ReferenceError"`）。与台账里第 692 轮登记的那一条**同一条根**（降级层不做「运行期查名字」那一档）。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { try { undefinedFn(); } catch (e) { return e.constructor.name; } })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
