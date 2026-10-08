// xl:title Object.prototype.toString.call(/a/)
// xl:round 693
// xl:judge stdout
// xl:want blocked
// xl:why `Object.prototype.toString.call(/a/)` 要 `[object RegExp]`，本仓在**字面量**这一步就断了（`unimplemented: expression RegularExpressionLiteral`）——与 `tests/cases/stdlib/globals` 那一族 **`RegExp` 待做项**同一条根。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.prototype.toString.call(/a/)));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
