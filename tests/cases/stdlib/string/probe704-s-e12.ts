// xl:title "a1b2".replace(/\d/g, "#")
// xl:round 704
// xl:judge stdout
// xl:want blocked
// xl:why 正则字面量还没实现（`unimplemented: expression RegularExpressionLiteral`）——`RegExp` 整族待做，与第 703 轮登记的 `p703s-e33` **同一条根**。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show("a1b2".replace(/\d/g, "#")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
