// xl:title (function () { const xs = [1, 2, 3]; Object.defineProperty(xs, "1", { value: 9 }); return [xs[1], xs.length, Object.keys(xs).join(",")].join("|"); })()
// xl:round 698
// xl:judge stdout
// xl:want differ
// xl:why `Object.defineProperty(数组, "1", { value: 9 })` 在 JS 里**改的是那一格元素**（`xs[1]` 给 `9`），本仓给 `2`（**静默错值**）：数组的元素**不住在 `Props` 里**（在 `Elements` 上，`heap.xl.md` 写着），而 `DefineOwnFromDescriptor` 那一趟只扫属性表。同族还有 `delete xs[1]`（第 289 轮已修）与 `Object.assign([], [1,2])`——**「下标不是自有属性」那一族**的第三格。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const xs = [1, 2, 3]; Object.defineProperty(xs, "1", { value: 9 }); return [xs[1], xs.length, Object.keys(xs).join(",")].join("|"); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
