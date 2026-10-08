// xl:title Math.f16round(1.1)
// xl:round 703
// xl:judge stdout
// xl:want differ
// xl:why `Math.f16round` 没装（与 `stdlib/math/044-names-math` **同一条根**）：JS 给半精度（IEEE 754 binary16）最近偶数舍入，`Math.f16round(1.1)` 是 `1.099609375`。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Math.f16round(1.1)));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
