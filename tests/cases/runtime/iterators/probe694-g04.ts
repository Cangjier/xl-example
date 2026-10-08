// xl:title (function () { function* g() { yield 1; yield 2; } const it = g(); return it.return(7).value; })()
// xl:round 694
// xl:judge stdout
// xl:want differ
// xl:why 生成器的 `it.return(7)` 在 JS 里让 `next()` 之后那一步给 `{ value: 7, done: true }`，本仓给的是**最后产出的那个值**（`1`）——`return()` 的实参**没有被用上**（**静默错值**）。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { function* g() { yield 1; yield 2; } const it = g(); return it.return(7).value; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
