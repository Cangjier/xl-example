// xl:title "abc".replace(/b/, "X")
// xl:round 703
// xl:judge stdout
// xl:want blocked
// xl:why 正则字面量还没实现（`unimplemented: expression RegularExpressionLiteral`）——`RegExp` 整族待做，见 `stdlib/string/136` 与 `probe693-y30` 那一族。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show("abc".replace(/b/, "X")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
