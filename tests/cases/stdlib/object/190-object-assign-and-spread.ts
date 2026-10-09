// xl:title `Object.assign` 与对象展开：取值器、符号键、覆盖序与目标身份
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的三十余条**：
//   probe-j10 · probe693-o10 · probe693-o11 · probe694-o26 · probe694-o27 · probe694-o38（无关那一半）
//   · probe695-o14 · probe695-o15 · probe697-f19 · probe704-o-d06 · probe704-o-d07 ·
//   probe704-o-d39 · probe698-f02 · probe698-f03 · probe698-f14 · probe703-o-a10 ·
//   probe703-o-a29 · probe705-o-b28 · p-obj-assign-symbol · p-obj-spread-symbol
//   ＋ `002-object-assign` / `019-object-assign-forms-root` / `022-object-assign-forms-and-order`
//     / `037-object-assign-and-spread` / `054-object-assign-forms-r304` / `056-object-assign-three-sources`
//     / `070-object-assign-and-getters` / `076-object-assign-getters-and-order` / `088-object-spread-getters`
//     / `094-object-assign-spread` / `106-object-assign-getters-and-symbols` / `145-object-assign-symbol`
//
// 判定点只有一个：**`CopyDataProperties` 那一趟的取值口径**——
//  ① 读的是**取值**（`[[Get]]`，取值器被调用一次）而不是描述符；
//  ② 只搬**可枚举自有**格（不可枚举的不搬，符号键照搬）；
//  ③ 后面的来源盖前面的；`null` / `undefined` 来源**跳过**（不抛）；
//  ④ 返回**目标本身**（身份不变）；
//  ⑤ 对象展开 `{ ...src }` 与 `assign` 同一口径。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
const sym = Symbol("s");

try {
  // ① 取值器被调用一次、搬的是值
  let n = 0;
  const src: any = { get a() { n++; return 1; } };
  const dst: any = {};
  Object.assign(dst, src);
  console.log(show(n + ":" + dst.a));
  const copy: any = { ...src };
  console.log(show([copy.a, Object.getOwnPropertyDescriptor(copy, "a")!.get === undefined].join("|")));
  console.log(show(Object.assign({}, { get a() { return 5; } }).a));
  // ② 可枚举自有 + 符号键
  const withHidden: any = { a: 1 };
  Object.defineProperty(withHidden, "b", { value: 2, enumerable: false });
  console.log(show(Object.keys(Object.assign({}, withHidden)).join(",")));
  console.log(show(Object.assign({}, { [sym]: 1 })[sym]));
  console.log(show(Object.assign({}, { a: 1 }, { a: 2 }).a));
  console.log(show(Object.assign({}, { a: 1 }, { b: 2 }).b));
  console.log(show(Object.assign({ a: 1 }, { a: 2 }).a));
  console.log(show(Object.assign({}, { a: 1 }, null, undefined).a));
  console.log(show(Object.assign({}, null) && "ok"));
  console.log(show(Object.assign(Object.create(null), { a: 1 }).a));
  // ③ 返回目标本身
  const target: any = {};
  console.log(show(Object.assign(target, { a: 1 }) === target));
  // ④ 展开与 assign 同一口径
  console.log(show({ ...{ a: 1 } }.a));
  console.log(show(JSON.stringify({ ...{ a: 1 }, b: 2 })));
  console.log(show(Object.keys({ a: 1, ...{ b: 2 } }).join(",")));
  // ⑤ 数组目标：`length` 跟着下标走（与 `defineProperty` 那条路不同的一个侧面）
  const arrTarget: any = [];
  Object.assign(arrTarget, { 0: "x", 2: "z" });
  console.log(show(arrTarget.length + ":" + arrTarget.join("|")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
