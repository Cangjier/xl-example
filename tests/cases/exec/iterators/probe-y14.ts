// xl:title (function* () { const x = yield 1; return x; })()
// xl:round 692
// xl:judge stdout
// xl:want differ
// xl:why `Object.prototype.toString` 的**内部标签**只认到 `[object Object]`：生成器对象没有自己那一格（Node 给 `[object Generator]`），与第 690 轮补的包装对象标签同一条路——只差**生成器 / 异步函数**这两档（`stdlib/console/030` 记的是同一族）。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function* () { const x = yield 1; return x; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
