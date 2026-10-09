// xl:title `String(…)` 与 `${…}`：值 → 字符串那一趟
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的十三条**：
//   probe3-y01 · probe3-y02 · probe3-y03 · probe3-y20 · probe693-y42 · probe693-y43 ·
//   probe693-y44 · probe693-y45 · probe704-s-e01 · probe704-s-e02 · probe704-s-e03 ·
//   probe704-s-e04 · probe704-s-e05 · probe699-s-e51 · probe699-s-e55 · probe694-y12 ·
//   probe694-y13 · probe694-y14 · probe694-y15
// 判定点只有一个：**`ToString` 那张表**（`String(v)` 与模板串里那一次转换走同一条路）——
//  ① 原始值四档：`null` / `undefined` / `true` / 数字（含 `1e21` / `1e-7` / `0.000001` 三个格式化档）；
//  ② 对象走 `ToPrimitive`：数组给 `join(",")`、普通对象给 `[object Object]`；
//  ③ **符号**：`String(sym)` 给 `"Symbol(x)"`，而 `${sym}` / `+` 抛 `TypeError`。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
const sym = Symbol("x");

try {
  // ① 原始值
  console.log(show(String(null)));
  console.log(show(String(true)));
  console.log(show(String(1e21)));
  console.log(show(String(1e-7)));
  console.log(show(String(0.000001)));
  console.log(show(String(123456789012345678901234567890)));
  // ② 对象
  console.log(show(String([1, 2])));
  console.log(show(String({})));
  console.log(show("a" + ({} as any)));
  console.log(show("a" + null + undefined));
  // ③ 符号：两个入口两档
  console.log(show(String(sym)));
  console.log(show("abc".length));
  console.log(show(`${1}${2}`));
  console.log(show(`x`.length));
  console.log(show(`a${1}b`.length));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
