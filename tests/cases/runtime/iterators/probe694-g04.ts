// xl:title (function () { function* g() { yield 1; yield 2; } const it = g(); return it.return(7).value; })()
// xl:round 694
// xl:judge stdout
// xl:want differ
// xl:why 生成器的 `it.return(7)` 在 JS 里让 `next()` 之后那一步给 `{ value: 7, done: true }`，
//       本仓给的是**最后产出的那个值**（`1`）——`return()` 的实参**没有被用上**
//       （**静默错值**）。第 713 轮量清了根子：判据只长在 `Op.CheckGeneratorReturn` 上
//       （挂在每个 `yield` 后面），而新生成器收到 `return(v)` 之后照旧**从头跑**。
//       收它要分「一次都没跑过」（当场收摊、函数体不执行）与「跑到 `yield` 停下」
//       （跑 `finally` 链）两档——第 713 轮试过用 `HeapGenerator.Started` 分开，
//       **实测 128 条回归**（挂起点那一档被打断），当场回退并记在 `tests/cases/README.md`。
//       要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { function* g() { yield 1; yield 2; } const it = g(); return it.return(7).value; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
