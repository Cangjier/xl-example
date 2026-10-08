// xl:title "ab".repeat({ valueOf: () => 2 })
// xl:round 700
// xl:judge stdout
// xl:want differ
// xl:why `ArgOr`（`slice` / `charAt` / `at` / `repeat` / `padStart` / `indexOf` 那十几个内建**共用**的取值器）只认数字与小数：**字符串 / 对象一律落到缺省值**，而 JS 那一步是 `ToIntegerOrInfinity(ToNumber(v))`。`ToNumber` 要 `room` / `call` / `protos`（字符串解析与 `ToPrimitive` 都在那一处），而这个取值器的签名里没有它们——要收它得把那一套灌进十几个共用它的内建，是另一处活。**同一族**：`e08` / `e09` / `e10` / `e11` / `e12` / `e13` / `e14` / `e15` / `e16` / `e17` / `e18` / `e19` / `e38`。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show("ab".repeat({ valueOf: () => 2 })));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
