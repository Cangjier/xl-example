// xl:title `Array` 构造器 / `of` / `from` / `isArray`：三种造的写法
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的三十余条**：
//   probe-a06 · probe-a07 · probe-a08 · probe-a36 · probe-a39 · probe-a40 · probe693-a25 ·
//   probe693-a26 · probe693-a27 · probe693-a28 · probe693-a29 · probe693-a30 ·
//   probe694-a04 · probe694-a05 · probe694-a06 · probe694-a07 · probe694-a08 ·
//   probe703-a-b20 · probe703-a-b22 · probe703-a-b23 · probe703-a-b24 · probe703-a-b39 ·
//   probe703-a-b40 · probe703-a-b47 · probe703-a-b48 · probe704-a-f07 · probe704-a-f09 ·
//   probe704-a-f19 · p-arr-from-arraylike · p-arr-from-mapfn · p-arr-from-hole-fill
//   ＋ `007-array-isarray-from` / `009-array-of-root` / `024-array-from-mapfn-and-sources`
//     / `036-array-from-length-and-mapfn` / `049-array-of-and-from-forms` / `055-array-from-holes-and-length`
//     / `072-array-from-mapfn-thisarg` / `080-array-from-iterable-forms` / `081-array-of-and-isarray`
//     / `088-array-of-r623` / `095-array-from-mapper-thisarg` / `098-array-from-literals-and-sets`
//     / `103-array-isarray` / `121-array-from-mapfn` / `122-array-from-iterables` / `129-array-from-map-iterable`
//
// 判定点只有一个：**三条造数组的路各收什么**——
//  ① `new Array(n)`：单个数字实参 = 造 **n 个洞**（不是 `[n]`）；多实参或非数字 = 元素；
//  ② `Array.of(…)`：永远按元素收（`Array.of(3)` 给 `[3]`，`Array.of()` 给 `[]`）；
//  ③ `Array.from(…)`：吃可迭代物与**类数组**（只有 `length` 的对象按洞补 `undefined`、
//     映射函数第二个实参是下标）；字符串按**码点**切；
//  ④ `Array.isArray`：只有真数组（含 `Array.prototype`）给真，类数组给假。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show(new Array(3).length));
  console.log(show(Array(1, 2).length));
  console.log(show(Array.of(3).length));
  console.log(show(Array.of(1, 2).join(",")));
  console.log(show(Array.of().length));
  console.log(show(Array.of(1, 2).length));
  console.log(show(Array.from({ length: 2 }).length));
  console.log(show(Array.from({ length: 2 }).join(",")));
  console.log(show(Array.from({ length: 2, 0: "a", 1: "b" }).join(",")));
  console.log(show(Array.from([1, 2], (x: any) => x * 2).join(",")));
  console.log(show(Array.from({ length: 2 }, (_: any, i: any) => i).join(",")));
  console.log(show(Array.from("ab").join(",")));
  console.log(show(Array.from("abc").join(",")));
  console.log(show(Array.from(new Set([1, 2, 2])).join(",")));
  console.log(show(Array.from([, 1]).length));
  console.log(show(Array.from([, 1])[0]));
  console.log(show(Array.isArray([])));
  console.log(show(Array.isArray(Array.prototype)));
  console.log(show(Array.isArray({ length: 0 })));
  console.log(show([].length));
  console.log(show([, ,].length));
  console.log(show([, 1].length));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
