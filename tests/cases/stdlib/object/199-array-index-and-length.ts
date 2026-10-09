// xl:title 数组的下标格与 `length`：`hasOwn` / 名表 / 赋值与 `delete`
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的十二条**：
//   probe693-o22（无关那一半）· probe693-o35 · probe693-o36 · probe694-o22 · probe703-o-a23 ·
//   probe703-o-a24 · probe705-o-b31（无关那一半）
//   ＋ `p-obj-delete-array-slot` / `p-obj-keys-holes` / `p-obj-keys-string` / `125-array-length-descriptor`
//
// 判定点只有一个：**下标是自有的普通格、`length` 是跟着走的那一格**——
//  ① 下标与 `length` 都在自有名表里（`getOwnPropertyNames` 带 `length`，`keys` 只带下标）；
//  ② 洞（`delete` 之后）不进 `keys` / `hasOwn` 假，但 `length` 不变；
//  ③ 赋一个大下标会把 `length` 顶上去；赋 `length` 削短会**真删掉**后面的格。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  const a: any = [1, 2];
  console.log(show(Object.getOwnPropertyNames(a).join(",")));
  console.log(show(Object.keys(a).join(",")));
  console.log(show(Object.hasOwn(a, 0)));
  console.log(show(Object.hasOwn(a, "length")));
  console.log(show(a.hasOwnProperty(0)));
  delete a[0];
  console.log(show(Object.keys(a).join(",")));
  console.log(show(a.length + ":" + (0 in a) + ":" + Object.hasOwn(a, 0)));
  const b: any = [1];
  b[3] = 4;
  console.log(show(b.length + ":" + b.join(",")));
  const c: any = [1, 2, 3];
  c.length = 1;
  console.log(show(c.length + ":" + c.join(",") + ":" + Object.keys(c).join(",")));
  console.log(show(Object.keys("ab").join(",")));
  console.log(show("ab".length + ":" + Object.hasOwn("ab", "length")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
