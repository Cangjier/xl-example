// xl:title `fill` / `copyWithin`：负区间、越界与重叠复制
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的二十余条**：
//   probe-a32 · probe693-a09 · probe693-a10 · probe693-a11 · probe694-a09 · probe694-a10 ·
//   probe694-a20 · probe694-a21 · probe696-h17 · probe696-h23 · probe703-a-b10 ·
//   probe703-a-b11 · probe704-a-f08 · p-arr-copywithin · p-arr-fill-negative
//   ＋ `016-array-copywithin-root` / `025-array-fill-and-copywithin-negative-root`
//     / `040-array-fill-and-copywithin-negative-r291` / `048-array-fill-and-copywithin-forms`
//     / `069-array-fill-and-copywithin-negative-r371` / `086-array-copywithin-fill`
//     / `099-array-fill-negative-and-undefined` / `108-array-splice-copywithin-fill`
//     / `111-array-copywithin-r676` / `131-copywithin-fill-range`
//
// 判定点只有一个：**两个下标参数的规范化**——
//  ① `fill(value, start, end)`：负下标从尾数；`end` 缺省到尾巴；`start` 越界什么都不做；
//     不写 `value` 就是 `undefined`；
//  ② `copyWithin(target, start, end)`：同样三格实参与负下标；**重叠时按拷贝方向处理**
//     （先取出来再写，不会出现「边写边读」的错位）；
//  ③ 两者都返回**原数组**、都是原地改。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show([1, 2, 3].fill(0, 1, 2).join(",")));
  console.log(show([1, 2, 3].fill(0, 1).join(",")));
  console.log(show([1, 2, 3].fill(0, -1).join(",")));
  console.log(show([1, 2, 3].fill(0, 3).join(",")));
  console.log(show(Array(3).fill(0).join(",")));
  console.log(show(new Array(2).fill(7).length));
  console.log(show(new Array(3).fill(1).join("")));
  console.log(show([1, 2, 3].copyWithin(0, 1).join(",")));
  console.log(show([1, 2, 3].copyWithin(-1).join(",")));
  const ov: any = [1, 2, 3, 4, 5];
  console.log(show(ov.copyWithin(1, 0, 3).join(",")));
  const back: any = [1, 2, 3, 4, 5];
  console.log(show(back.copyWithin(0, 1, 4).join(",")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
