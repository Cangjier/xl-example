// xl:title `Object.keys(原始值)`：数字没有自有可枚举键，给空表
// xl:round 692
// xl:judge stdout
// xl:end
// 本文件合并了原先**逐字节相同**的三条原子探针（第 692 / 694 / 704 轮各抄了一遍）：
//   probe-j01 · probe694-o04 · probe704-o-d12
// 判定点只有一个：**`Object.keys` 收原始值时先 `ToObject`，数字的包装对象没有自有可枚举键**
// ⇒ 空表。打印壳与原来那三条一致。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show(Object.keys(1).length));
  // 同一片的边界：`null` / `undefined` 该抛（它们连 `ToObject` 都过不去）
  console.log(show(Object.keys(true).length));
  console.log(show(Object.keys("ab").join(",")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
