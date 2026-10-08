// xl:title (function () { return Array.isArray(arguments); })()
// xl:round 693
// xl:judge stdout
// xl:want differ
// xl:why 本仓的 `arguments` **就是一个数组** ⇒ `Array.isArray(arguments)` 给真（JS 给假）。第 690 轮已经登记过一次（`138-object-tostring-arguments-gap` 那条讲的是标签给 `[object Array]`）——这一条钉的是**同一个根的另一面**。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { return Array.isArray(arguments); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
