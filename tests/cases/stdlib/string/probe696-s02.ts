// xl:title "abc".replace(/b/, (m) => m + m)
// xl:round 696
// xl:judge stdout
// xl:want blocked
// xl:why 正则字面量那一档还没实现（`unimplemented: expression RegularExpressionLiteral`）——`replace` 的**回调**那一半另有判据（`probe696-s02` 的兄弟 s04 走的是文本切分），缺的是**裁判这一侧的语法**。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show("abc".replace(/b/, (m) => m + m)));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
