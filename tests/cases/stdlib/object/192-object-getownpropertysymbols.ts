// xl:title `Object.getOwnPropertySymbols`：只收自有符号键，与 `keys` / `propertyIsEnumerable` 分工
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的十二条**：
//   probe694-o09 · probe695-o21 · probe703-o-a30 · probe704-o-d19
//   ＋ `080-object-getownpropertynames-vs-symbols` / `102-object-getownpropertysymbols-forms`
//     / `112-object-getownpropertysymbols-r676` / `168-getownpropertysymbols` / `099-...r647`
//     / `p-obj-symbol-in-keys`
//
// 判定点只有一个：**符号键与字符串键是两张名表**——
//  ① `getOwnPropertySymbols` 只收**自有**符号键（继承来的不算）；
//  ② `getOwnPropertyNames` / `keys` 一支符号键都不带；
//  ③ 不可枚举的符号键**照样进** `getOwnPropertySymbols`（与字符串键那一支不同）；
//  ④ `propertyIsEnumerable` 对符号键问得出答案。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
const s = Symbol("s");

try {
  const o: any = { a: 1, [s]: 2 };
  console.log(show(Object.getOwnPropertySymbols(o).length));
  console.log(show(Object.keys(o).join(",")));
  console.log(show(Object.getOwnPropertyNames(o).join(",")));
  console.log(show(Object.getOwnPropertySymbols({ [Symbol("x")]: 1 }).length));
  // 不可枚举的符号键照样进
  const hidden: any = {};
  Object.defineProperty(hidden, s, { value: 1, enumerable: false });
  console.log(show(Object.getOwnPropertySymbols(hidden).length));
  console.log(show([hidden[s], Object.keys(hidden).length, hidden.propertyIsEnumerable(s)].join(",")));
  // 继承来的不算
  const parent: any = { [s]: 1 };
  const child: any = Object.create(parent);
  console.log(show(Object.getOwnPropertySymbols(child).length));
  console.log(show((child as any)[s]));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
