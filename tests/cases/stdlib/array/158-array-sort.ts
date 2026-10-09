// xl:title `sort`：默认字典序、比较器、稳定性与 `undefined` / 洞的落位
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的三十余条**：
//   probe-a09 · probe-a29 · probe693-a31 · probe693-a32 · probe693-a33 · probe693-a34 ·
//   probe696-r50 · probe698-a01 · probe698-a02 · probe698-a03 · probe698-a04 ·
//   probe698-a05 · probe698-a06 · probe698-a08 · probe698-a09 · probe698-a10 ·
//   probe703-a-b31 · probe703-a-b32 · p-arr-sort-default
//   ＋ `006-array-sort-root` / `020-array-sort-strings-and-mixed` / `026-array-sort-default-lexicographic`
//     / `037-array-sort-stability-and-default` / `053-array-sort-undefined-and-holes`
//     / `064-array-sort-stability-r323` / `066-array-sort-forms` / `071-array-sort-stability-and-holes`
//     / `091-array-sort-r623` / `094-array-sort-comparator-nan` / `096-array-sort-comparator-forms`
//     / `100-array-sort-stability-root` / `105-array-sort-stability-and-comparator`
//     / `110-array-sort-stability-r9` / `119-sort-edges` / `128-sort-nan-and-holes`
//     / `138-sort-default-string` / `139-sort-stability` / `146-sort-undefined-and-stability`
//     / `152-array-sort-throw-cleanup`
//
// 判定点只有一个：**`sort` 的比较口径与落位**——
//  ① 不给比较器：元素转字符串按**码元**序（`10 < 9`）；
//  ② 给了比较器：只看返回值的**符号**（小数、`NaN` 一律当 0）；
//  ③ 稳定：比出来相等时保持原序；
//  ④ `undefined` 与**洞**一律排到最后（洞再往后），且不调比较器；
//  ⑤ 返回**原数组**（身份不变，原地排）。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show([3, 1, 2].sort().join(",")));
  console.log(show([10, 1, 3].sort().join(",")));
  console.log(show([10, 9, 1].sort().join(",")));
  console.log(show(["b", "a", "C"].sort().join(",")));
  console.log(show([3, 1, 2].sort((a: any, b: any) => b - a).join(",")));
  console.log(show([10, 9, 1].sort((x: any, y: any) => x - y).join(",")));
  console.log(show([3, 1, 2].sort(() => 0).join(",")));
  console.log(show([3, 1, 2].sort(() => NaN).join(",")));
  console.log(show([3, undefined, 1].sort().join(",")));
  console.log(show([undefined, 1, 2].sort().join(",")));
  console.log(show([1, undefined, 2].sort().length));
  console.log(show([1, , 3].sort().join(",")));
  console.log(show([1, 2, 3].sort((x: any, y: any) => String(x) < String(y) ? -1 : 1).join(",")));
  const same: any = [1, 2, 3];
  console.log(show(same.sort((a: any, b: any) => a - b) === same));
  const stable: any = [{ k: 1, i: 0 }, { k: 1, i: 1 }, { k: 0, i: 2 }];
  stable.sort((a: any, b: any) => a.k - b.k);
  console.log(show(stable.map((x: any) => x.i).join(",")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
