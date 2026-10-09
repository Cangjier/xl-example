// xl:title `flat` / `flatMap`：深度参数、`Infinity` 与洞的落法
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的二十余条**：
//   probe-a04 · probe-a21 · probe693-a01 · probe693-a02 · probe693-a03 · probe693-a04 ·
//   probe694-a01 · probe694-a02 · probe694-a19 · probe703-a-b01 · probe703-a-b02 ·
//   probe703-a-b09 · probe703-a-b45 · probe704-a-f18 · probe696-r16（无关那一半）
//   ＋ `010-array-flatmap` / `019-array-flat-depth` / `034-array-flat-deep-levels`
//     / `038-array-flat-deep-and-infinity` / `052-array-flat-and-flatmap-forms`
//     / `059-array-flatmap-and-depth` / `065-array-flat-and-with` / `075-array-flat-depth-forms`
//     / `102-array-flat-depth-and-sparse` / `104-array-flat-depth-and-holes` / `106-array-flat-flatmap`
//     / `123-flat-depth` / `124-flatmap-holes` / `153-array-flat-symbol-isconcat` / `p-arr-flat-depth`
//
// 判定点只有一个：**摊几层、洞怎么算**——
//  ① `flat()` 默认摊 **1 层**；`flat(0)` 一层都不摊；`flat(d)` 摊 d 层；`flat(Infinity)` 摊到底；
//  ② `flatMap` 永远只摊 **1 层**（等于 `map` + `flat()`）；
//  ③ 摊的时候**洞被去掉**（结果里没有洞）；
//  ④ 只认真数组（`Symbol.isConcatSpreadable` 不参与这一族）。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
const deep: any = [[1, [2, [3]]]];

try {
  console.log(show([1, [2, 3]].flat().length));
  console.log(show(deep.flat().join(",")));
  console.log(show(deep.flat(2).join(",")));
  console.log(show(deep.flat(Infinity).join(",")));
  console.log(show([1, 2, 3].flat(0).length));
  console.log(show([[1], [2]].flat().join(",")));
  console.log(show([1, 2].flatMap((x: any) => [x, x]).join(",")));
  console.log(show([1, 2].flatMap((x: any) => [x, x]).length));
  console.log(show([1, 2, 3].flatMap((x: any) => x).length));
  console.log(show([1, 2, 3].flatMap((x: any) => [x, x]).length));
  console.log(show([1, , 3].flat().length));
  console.log(show([1, , 3].flatMap((x: any) => [x]).length));
  console.log(show([1, , 3].flat().join(",")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
