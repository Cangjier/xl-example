// xl:title (function () { try { undefinedFn(); } catch (e) { return e instanceof ReferenceError; } })()
// xl:round 692
// xl:judge stdout
// xl:want blocked
// xl:why 读一个**没声明过**的名字在**降级期**就抛（`name is not a local or a capture`），而 JS 要到**运行期**才抛 `ReferenceError`（`try` 接得住、`typeof` 也接得住）。`typeof` 那一格第 149 轮已经单独放行，**调用 / 普通读**这一格还没有。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { try { undefinedFn(); } catch (e) { return e instanceof ReferenceError; } })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
