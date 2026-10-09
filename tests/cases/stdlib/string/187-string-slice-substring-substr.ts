// xl:title `slice` / `substring` / `substr` 的三种负下标口径与越界
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的十八条**：
//   probe-s04 · probe-s05 · probe-s06 · probe3-y08 · probe3-y09 · probe694-y03 ·
//   probe694-y04 · probe695-y12 · probe695-y13 · probe696-s20 · probe696-s21 ·
//   probe699-s-e27 · probe699-s-e29 · probe703-s-e09 · probe703-s-e10 · probe704-s-e15 ·
//   probe704-s-e16 · probe704-s-e17 · probe705-s-g03 · probe705-s-g04 · probe705-s-g05
// 判定点只有一个：**三种切法各自的规范化**——
//  ① `slice`：负下标从**尾**数（`-2` → `length-2`），越界夹到两端；
//  ② `substring`：负下标**当 0**，且两个实参**谁大谁小都交换**；
//  ③ `substr`（遗留）：第一个是起点（可为负）、第二个是**长度**。
// 三者在这三档上给出不同的答案，所以它们不是同一条用例的三份、而是**同一条用例的三面**。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  // ① slice：负下标从尾数、越界夹住
  console.log(show("abc".slice(-2)));
  console.log(show("abc".slice(-2, -1)));
  console.log(show("abc".slice(1, -1)));
  console.log(show("abc".slice(0, -1)));
  console.log(show("abc".slice(-10)));
  console.log(show("abc".slice(3)));
  console.log(show("abc".slice(-3)));
  // ② substring：负当 0、实参有序
  console.log(show("abc".substring(2, 0)));
  console.log(show("abc".substring(2, 1)));
  console.log(show("abc".substring(-1, 2)));
  console.log(show("abc".substring(1, 2)));
  console.log(show("abc".substring(3, 0)));
  console.log(show("abc".substring(-1)));
  // ③ substr：第二个是长度
  console.log(show("abc".substr(1, 2)));
  console.log(show("abc".substr(1, 1)));
  console.log(show("abc".substr(-2, 1)));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
