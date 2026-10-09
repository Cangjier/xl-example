// xl:title `Object.fromEntries` / `entries`：来源形态、重复键与往返
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的十二条**：
//   probe693-o07 · probe693-o09 · probe694-o28 · probe694-o29 · probe703-o-a09 · probe-j22
//   ＋ `011-object-fromentries` / `042-object-fromentries-forms-r291` / `052-object-fromentries-forms-r304`
//     / `057-object-fromentries-duplicates` / `084-object-fromentries-and-roundtrip`
//     / `108-object-fromentries-groupby` / `144-fromentries-symbol` / `147-fromentries-dup`
//     / `p-obj-fromentries-dup`
//
// 判定点只有一个：**`fromEntries` 收什么、重复键怎么办**——
//  ① 来源是**可迭代的键值对**（数组的数组、`Map` 都行）；
//  ② 重复键**最后一个赢**；
//  ③ 与 `entries` 往返是恒等；
//  ④ 符号键也照搬（`entries` 不带符号键，那一半在 `192`）。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
const sym = Symbol("s");

try {
  console.log(show(Object.fromEntries([["a", 1]]).a));
  console.log(show(Object.fromEntries([["a", 1], ["b", 2]]).b));
  console.log(show(Object.fromEntries(new Map([["a", 1]])).a));
  console.log(show(Object.fromEntries([["a", 1], ["a", 2]]).a));
  console.log(show(Object.fromEntries([[sym, 1]])[sym]));
  const round: any = Object.fromEntries(Object.entries({ a: 1, b: 2 }));
  console.log(show(JSON.stringify(round)));
  console.log(show(Object.keys(round).join(",")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
