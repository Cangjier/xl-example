// xl:title (function () { const o = { toString: () => "k" }; return { [o]: 1 }.k; })()
// xl:round 698
// xl:judge stdout
// xl:want blocked
// xl:why **计算键是一个对象**（`{ [o]: 1 }` 里 `o` 只有 `toString`）：JS 在这里做 `ToPropertyKey` → `ToPrimitive(o, "string")` → 调 `o.toString()`，本仓报 `unimplemented: ToString of this kind of value`（**整份文件进不来**）。根子在引擎侧那次「值 → 键」的转换没有调用通道（它要重入脚本才调得到 `toString`）——与 `ToPrimitive` 那一族的可选项口径同源。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { toString: () => "k" }; return { [o]: 1 }.k; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
