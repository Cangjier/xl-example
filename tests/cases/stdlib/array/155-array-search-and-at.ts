// xl:title `indexOf` / `lastIndexOf` / `includes` / `at`：`fromIndex` 与 `SameValueZero`
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的三十余条**（同一件事被逐批重抄的结果）：
//   probe-a01 · probe-a19 · probe-a27 · probe-a28 · probe-a35 · probe693-a05 ·
//   probe693-a06 · probe693-a18 · probe693-a19 · probe693-a54 · probe694-a13 ·
//   probe694-a14 · probe694-a22 · probe694-a25 · probe694-a26 · probe696-h12 ·
//   probe696-h13 · probe703-a-b03 · probe703-a-b28 · probe703-a-b29 · probe703-a-b30 ·
//   probe704-a-f11（无关那一半不算）· probe704-a-f12 · probe704-a-f13 · probe704-a-f14 ·
//   probe693-a51 · probe696-r28 · probe696-r29 · p-arr-includes-hole · p-arr-lastindexof-from
//
// 判定点只有一个：**三支查找方法的比较与起点**——
//  ① `indexOf` / `lastIndexOf` 用 `===`（**不认 `NaN`**、不认洞）；
//  ② `includes` 用 `SameValueZero`（**认 `NaN`**、洞也算 `undefined`）；
//  ③ `fromIndex`：负数从尾数、超过长度按「找不到」，`lastIndexOf` 的方向相反；
//  ④ `at` 收负下标（越界给 `undefined`），小数下标先 `ToIntegerOrInfinity` 截断。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
const holes: any = [1, , 3];

try {
  console.log(show([1, 2, 3].indexOf("1")));
  console.log(show([1, 2, 3].indexOf(2, -2)));
  console.log(show([1, 2].indexOf(1, 1)));
  console.log(show([1, 2, 3].indexOf(2, 1)));
  console.log(show([NaN].indexOf(NaN)));
  console.log(show([NaN].includes(NaN)));
  console.log(show([1, 2, 3].includes(2, 2)));
  console.log(show([1, 2, 3].includes(2)));
  console.log(show([1, 2].includes(1, 1)));
  console.log(show([1, 2, 3].lastIndexOf(2)));
  console.log(show([1, 2, 3].lastIndexOf(9)));
  console.log(show([1, 2, 3].lastIndexOf(2, 1)));
  console.log(show(holes.includes(undefined)));
  console.log(show(holes.indexOf(undefined)));
  console.log(show(holes.includes(3)));
  // `at` 那一支
  console.log(show([1, 2, 3].at(1)));
  console.log(show([1, 2, 3].at(-1)));
  console.log(show(String([1, 2, 3].at(3))));
  console.log(show([1, 2, 3].at(-4)));
  console.log(show([1, 2, 3].at(1.5)));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
