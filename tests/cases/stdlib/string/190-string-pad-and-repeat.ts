// xl:title `padStart` / `padEnd` / `repeat` 的目标长度、填充串与次数
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的十八条**：
//   probe-s16 · probe-s20 · probe3-y12 · probe3-y13 · probe693-y19 · probe693-y23 ·
//   probe693-y24 · probe693-y25 · probe694-y10 · probe695-y07 · probe695-y08 ·
//   probe699-s-e12 · probe699-s-e50 · probe703-s-e05 · probe703-s-e21 · probe704-s-e18 ·
//   probe704-s-e19 · probe705-s-g09
// 判定点只有一个：**这三个方法怎么处理目标长度与重复次数**——
//  ① 目标长度小于原长 ⇒ 原样返回（不截断）；
//  ② 填充串多字符 **循环取用**、只取到目标长度为止；
//  ③ 省略填充串给空格；
//  ④ `repeat` 的次数先取整（小数向下）、负数抛 `RangeError`。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show("x".repeat(3)));
  console.log(show("ab".repeat(3)));
  console.log(show("abc".repeat(0)));
  console.log(show("abc".repeat(1.5)));
  console.log(show("ab".repeat(2.5)));
  console.log(show("a".repeat(-1)));
  console.log(show("a".padEnd(3)));
  console.log(show("ab".padStart(4, "0")));
  console.log(show("ab".padEnd(1, "0")));
  console.log(show("abc".padEnd(5, "xy")));
  console.log(show("abc".padStart(5, "12")));
  console.log(show("abc".padEnd(6, "12")));
  console.log(show("abc".padStart(2, "0")));
  console.log(show("abc".padStart(2)));
  console.log(show("abc".padStart(5, "0")));
  console.log(show("a".padEnd(3, "-")));
  console.log(show("abc".padStart(10).length));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
