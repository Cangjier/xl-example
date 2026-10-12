// xl:title `concat` 与 `+`：多实参、非字符串实参、包装对象与数组
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的十二条**：
//   probe-s12 · probe3-y16 · probe693-y37 · probe699-s-e32 · probe700-g-e24 · probe700-g-e25 ·
//   probe700-g-e26 · probe703-s-e17 · probe704-s-e08 · probe704-s-e29 · probe705-s-g19（无关那一半）
// 判定点只有一个：**`String.prototype.concat` 的实参逐个过 `ToString`**——
//  ① 无实参给原串（不是空串）；
//  ② 多实参按顺序接；
//  ③ 非字符串实参（数字 / 布尔 / `null` / `undefined`）各按 `ToString` 那一表落；
//  ④ 数组走 `join(",")`。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show("abc".concat(1, 2)));
  console.log(show("a".concat("b", 1, null)));
  console.log(show("abc".concat()));
  console.log(show("ab".concat("c", "d")));
  console.log(show("a".concat("b", 1)));
  console.log(show("a".concat(1, true)));
  console.log(show("abc".concat(1, true, null, undefined)));
  console.log(show("abc".concat({ toString: () => "T" } as any)));
  console.log(show("abc".concat([1, 2] as any)));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
