// xl:title `find` / `findIndex` / `findLast` / `every` / `some`：谓词族的命中与短路
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的二十余条**：
//   probe-a05 · probe-a15 · probe-a22 · probe-a23 · probe-a24 · probe693-a07 · probe693-a08 ·
//   probe693-a39 · probe693-a40 · probe694-a11 · probe694-a12 · probe694-a23 · probe694-a24 ·
//   probe703-a-b04 · probe703-a-b05 · probe703-a-b33 · probe703-a-b34 · probe703-a-b35 ·
//   probe704-a-f10 · probe703-a-b36（无关那一半）· p-arr-findlast
//   ＋ `004-array-find-family` / `014-array-every-some` / `017-array-findlast`
//     / `041-array-every-some-shortcircuit` / `047-array-findindex-forms` / `054-array-every-some-empty-r305`
//     / `061-array-reduce-right-and-findindex` / `076-array-every-some-empty-r371`
//     / `109-array-every-some-reduce-edge` / `126-findlast-findlastindex`
//
// 判定点只有一个：**谓词族的答案与短路**——
//  ① `find` / `findIndex` 从左、`findLast` / `findLastIndex` 从右；没找到给 `undefined` / `-1`；
//  ② `every` 空数组给**真**、`some` 空数组给**假**（真空真、空假假）；
//  ③ 短路：`every` 一遇假停、`some` 一遇真停（回调次数是判据）；
//  ④ `filter` 交出新数组（长度可能为 0）。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show([1, 2, 3].find((x: any) => x > 5)));
  console.log(show([1, 2, 3].find((x: any) => x > 1)));
  console.log(show([1, 2, 3].findIndex((x: any) => x > 1)));
  console.log(show([1, 2, 3, 4].findLast((x: any) => x % 2 === 1)));
  console.log(show([1, 2, 3, 4].findLastIndex((x: any) => x % 2 === 1)));
  console.log(show([1, 2, 3].findLast((x: any) => x > 1)));
  console.log(show([1, 2, 3].findLastIndex((x: any) => x < 3)));
  console.log(show([].every((x: any) => false)));
  console.log(show([].some((x: any) => true)));
  console.log(show([1, 2, 3].every((x: any) => x > 0) + "," + [1, 2, 3].some((x: any) => x > 2)));
  console.log(show([1, 2, 3].every((x: any) => x > 0)));
  console.log(show([1, 2, 3].some((x: any) => x > 2)));
  console.log(show([1, 2, 3].some((x: any) => x > 5)));
  console.log(show([1, 2, 3].filter((x: any) => x > 1).length));
  console.log(show([1, 2, 3].filter(Boolean).length));
  let everyN = 0;
  [1, 0, 3].every((x: any) => { everyN++; return x > 0; });
  let someN = 0;
  [0, 2, 3].some((x: any) => { someN++; return x > 0; });
  console.log(show(everyN + ":" + someN));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
