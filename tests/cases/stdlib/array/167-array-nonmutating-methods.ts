// xl:title 不改原数组的那几支：`toSorted` / `toReversed` / `toSpliced` / `with` / `findLast`
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的二十余条**：
//   probe694-a15 · probe694-a16 · probe694-a17 · probe698-a07 · probe703-a-b06 ·
//   probe703-a-b07 · probe703-a-b08 · probe696-r21 · probe696-r22 · probe696-r23 · probe696-r24
//   ＋ `021-array-tosorted-and-with` / `027-array-with-and-tosorted-forms-root`
//     / `045-array-with-and-tosorted-forms-r291` / `046-array-tospliced` / `062-array-tospliced-and-with`
//     / `065-array-flat-and-with` / `068-array-tospliced-and-reversed` / `087-array-findlast-tosorted`
//     / `092-toreversed-tospliced-tosorted` / `093-array-with-out-of-range` / `107-array-findlast-and-with`
//     / `112-l677p-arr-nonmutating-family` / `116-arg-array-tosort` / `127-tosorted-toreversed-with`
//
// 判定点只有一个：**这一族的「不改原数组」是硬判据**——
//  ① `toSorted` / `toReversed` / `toSpliced` / `with` 各自交一个**新数组**，原数组逐字节不变；
//  ② `with(i, v)` 越界（含负下标越界）抛 `RangeError`；
//  ③ `toSpliced` 的三格实参与 `splice` 同口径，只是不动原数组；
//  ④ 这一族与变异版（`sort` / `reverse` / `splice`）的读数**必须并排对照**才看得出区别。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
const err = (f: () => any): string => {
  try { return "no-throw:" + String(f()); } catch (e) { return (e as any).constructor.name; }
};

try {
  const src: any = [3, 1, 2];
  console.log(show(src.toSorted().join(",")));
  console.log(show(src.join(",")));
  console.log(show([2, 1].toSorted((x: any, y: any) => x - y).join(",")));
  console.log(show([1, 2, 3].toReversed().join(",")));
  console.log(show([1, 2, 3].toSpliced(1, 1).join(",")));
  console.log(show([1, 2, 3].with(0, 9).join(",")));
  console.log(show(src.with ? "has" : "no"));
  console.log(show([1, 2, 3].toReversed ? "has" : "no"));
  console.log(show([3, 1, 2].toSorted ? "has" : "no"));
  console.log(show([1, 2, 3].find ? "has" : "no"));
  console.log(show(err(() => [1, 2].with(5, 0))));
  console.log(show(err(() => [1, 2].with(-3, 0))));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
