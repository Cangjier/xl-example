// xl:title (function () { const o = { f: () => 1 }; return o?.f?.(); })()
// xl:round 693
// xl:judge stdout
// xl:want blocked
// xl:why **可选调用**连续两次（`o?.f?.()`）本仓在降级期报 `name is not a local or a capture: return`（**整份文件进不来**）；单次 `o?.f()` 那条路是好的。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { f: () => 1 }; return o?.f?.(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
