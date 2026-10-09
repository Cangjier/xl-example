// xl:title `reduce` / `reduceRight`：初值的有无与空数组那一档
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的二十余条**：
//   probe-a14 · probe693-a35 · probe693-a36 · probe693-a37 · probe693-a38 · probe703-a-b13 ·
//   probe703-a-b36 · probe696-r32（无关那一半）· p-arr-reduce-empty · p-arr-reduceright
//   ＋ `005-array-reduce` / `015-array-reduceright` / `029-array-reduce-forms-and-empty`
//     / `033-array-reduce-empty-throws` / `039-array-reduce-with-and-without-initial`
//     / `050-array-reduce-forms` / `073-array-reduce-empty-forms` / `097-array-reduce-side-effects`
//     / `101-array-reduce-empty-family` / `134-reduce-empty` / `147-reduceright-and-entries`
//
// 判定点只有一个：**初值那一位决定一切**——
//  ① 给了初值：从第一个元素开始累积，空数组**给初值**（不抛）；
//  ② 不给初值：拿**第一个存在的元素**当初值；空数组（或只有洞）抛 `TypeError`；
//  ③ `reduceRight` 只是方向反过来（回调的实参顺序仍是 `(acc, value, index, array)`）；
//  ④ 回调族**跳过洞**（不给初值时，洞也算「不存在」）。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
const err = (f: () => any): string => {
  try { return "no-throw:" + String(f()); } catch (e) { return (e as any).constructor.name; }
};

try {
  console.log(show([1, 2, 3].reduce((a: any, b: any) => a + b, 10)));
  console.log(show([1, 2, 3].reduce((a: any, b: any) => a + b)));
  console.log(show([].reduce((a: any, b: any) => a + b, 10)));
  console.log(show(err(() => [].reduce((a: any, b: any) => a + b))));
  console.log(show([1, 2, 3].reduceRight((a: any, b: any) => a + "-" + b)));
  console.log(show([1, 2, 3].reduceRight((a: any, b: any) => a - b)));
  console.log(show([1, , 3].reduce((a: any, b: any) => a + b)));
  console.log(show([1, , 3].reduce((a: any, b: any) => a + b, 0)));
  console.log(show([, ,].reduce((a: any, b: any) => a + b, 0)));
  // 回调的实参表：`(acc, value, index, array)`
  const argsSeen: any[] = [];
  [10, 20].reduce((a: any, v: any, i: any, arr: any) => { argsSeen.push([a, v, i, arr === undefined ? "?" : arr.length].join(":")); return a + v; });
  console.log(show(argsSeen.join("|")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
