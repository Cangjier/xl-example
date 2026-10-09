// xl:title `replace` / `replaceAll` 的字符串模式：首处 vs 全部、空模式
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的十八条**：
//   probe-s14 · probe-s15 · probe694-y01 · probe694-y02 · probe695-y06 · probe696-s24 ·
//   probe699-s-e16 · probe699-s-e17 · probe699-s-t06 · probe703-s-e03 · probe703-s-e04 ·
//   probe704-s-e11 · probe705-s-g12 · probe705-s-g13
// 判定点只有一个：**字符串模式的替换次数**——
//  ① `replace` 换**第一处**、`replaceAll` 换**每一处**（不重叠、从左往右）；
//  ② 空模式：`replace("", "X")` 在**串首**插一次，`replaceAll("", "-")` 在**每个码元之间**都插；
//  ③ 模式里带 `$` 时按**字面**匹配（字符串模式不解析模式里的记号）。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show("abc".replace("b", "X")));
  console.log(show("abc".replaceAll("b", "X")));
  console.log(show("a1b2".replace("1", "X")));
  console.log(show("aaa".replaceAll("a", "b")));
  console.log(show("a-b-c".replaceAll("-", "+")));
  console.log(show("aXbX".replaceAll("X", "-")));
  console.log(show("aXbXc".replaceAll("X", "-")));
  console.log(show("a-b_c".replace("-", "+").replace("_", "+")));
  console.log(show("$1".replace("$1", "$1")));
  console.log(show("abc".replace("", "X")));
  console.log(show("abc".replaceAll("", "-")));
  console.log(show("abc".replace("", "-")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
