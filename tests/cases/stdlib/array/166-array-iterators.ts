// xl:title 数组迭代器：`values` / `keys` / `entries` 与 `Symbol.iterator` 是同一件东西
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的十二条**：
//   probe-a16 · probe-a17 · probe-a18 · probe-a33 · probe703-a-b25 · probe703-a-b26 ·
//   probe703-a-b27 · probe703-a-b49 · probe696-r18 · probe696-r19 · probe696-r20
//   ＋ `022-array-iterator-manual` / `035-array-iterator-protocol-manual` / `051-array-iterator-manual-forms`
//     / `067-array-iterator-next-and-spread` / `077-array-iterator-aliases` / `089-array-iterator`
//
// 判定点只有一个：**三个迭代器各自的步进值，以及 `next()` 的三段返回形状**——
//  ① `values()`（＝`Symbol.iterator`）一步一步给**元素**；
//  ② `keys()` 给**下标**；`entries()` 给 `[下标, 元素]`；
//  ③ 每步是 `{ value, done }`（走完那一档 `done` 真、`value` 是 `undefined`）；
//  ④ 展开 / `for...of` / 解构都吃这一条协议。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show([1, 2, 3].keys().next().value));
  console.log(show([1, 2, 3].values().next().value));
  console.log(show([1, 2, 3][Symbol.iterator]().next().value));
  console.log(show([1, 2, 3].entries().next().value.join(",")));
  const it: any = [1, 2].values();
  console.log(show(JSON.stringify(it.next())));
  console.log(show(JSON.stringify(it.next())));
  console.log(show(JSON.stringify(it.next())));
  console.log(show([...(function* () { yield 1; yield 2; })()].join(",")));
  const a: any = [1, 2];
  const [x, y] = a;
  console.log(show(x + "," + y));
  console.log(show([..."ab"].join(",")));
  console.log(show([...Array(3).keys()].join(",")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
