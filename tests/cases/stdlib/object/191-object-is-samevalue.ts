// xl:title `Object.is`：NaN / ±0 / 引用三档与 `SameValue` 的口径
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的九条**：
//   probe693-o19 · probe693-o20 · probe694-o30 · probe697-f18 · probe704-o-d33
//   ＋ `016-object-is` / `082-object-is-and-samevalue` / `104-object-is-and-setprototypeof`
//
// 判定点只有一个：**`Object.is` 与 `===` 的两处不同**——
//  ① `NaN` 与自己：`is` 真、`===` 假；
//  ② `+0` / `-0`：`is` 假、`===` 真；
//  ③ 其余（字符串数字不等、引用比身份）两者一致。
// 「`setPrototypeOf` 之后 `instanceof` 跟着变」那一件不属于本判定点，见 `198`。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show(Object.is(NaN, NaN)));
  console.log(show(NaN === NaN));
  console.log(show(Object.is(-0, 0)));
  console.log(show(-0 === 0));
  console.log(show(Object.is(0, -0)));
  console.log(show(Object.is("1", 1)));
  console.log(show(Object.is(Object.is, Object.is)));
  console.log(show(Object.is({}, {})));
  console.log(show(Object.is(null, null)));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
