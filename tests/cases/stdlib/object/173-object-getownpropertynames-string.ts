// xl:title `Object.getOwnPropertyNames(字符串)`：下标 + `length`
// xl:round 692
// xl:judge stdout
// xl:end
// 本文件合并了原先**逐字节相同**的四条原子探针（第 692 / 693 / 704 / 705 轮各抄了一遍）：
//   probe2-d21 · probe693-o05 · probe704-o-d13 · probe705-o-b25
// 判定点只有一个：**字符串的包装对象自有名表 = 下标（`"0"` / `"1"`）+ `length`**。
// 打印壳（`show`）与原来那四条一致，好让判据逐字节不变。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show(Object.getOwnPropertyNames("ab").join(",")));
  // 同一片的两个侧面：`length` 在、越界下标不在
  console.log(show(Object.getOwnPropertyNames("ab").includes("length")));
  console.log(show(Object.getOwnPropertyNames("ab").includes("2")));
  console.log(show(Object.getOwnPropertyNames("").join(",")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
