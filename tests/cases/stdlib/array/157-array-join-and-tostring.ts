// xl:title `join` / `toString` / `toLocaleString`：洞与空值那一格
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的二十余条**：
//   probe-a02 · probe-a34 · probe693-a44 · probe693-a45 · probe693-a46 · probe693-a56 ·
//   probe694-a27 · probe696-h02 · probe696-h14 · probe696-h16 · probe703-a-b15 ·
//   probe703-a-b16 · probe703-a-b17 · probe704-a-f15 · probe704-a-f16 · probe704-a-f17 ·
//   probe696-h25 · p-arr-join-nullish
//   ＋ `003-array-join` / `018-array-join-nullish` / `074-array-join-holes-and-nullish`
//     / `136-join-null-holes` / `031-array-tolocalestring` / `001-array-tostring`
//     / `140-array-tostring-custom-join` / `145-array-tostring-join-dynamic`
//
// 判定点只有一个：**元素 → 文本那一趟**——
//  ① 分隔串默认逗号，给了就用给的（空串也认）；
//  ② `null` / `undefined` / **洞** 一律给**空串**（三档在文本上分不出来）；
//  ③ `toString` 就是 `join(",")`（现读 `this.join`，改了就跟着改）；
//  ④ 嵌套走每一格自己的 `toString`；`toLocaleString` 走每一格的 `toLocaleString`。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
const holes: any = [1, , 3];

try {
  console.log(show([1, 2, 3].join()));
  console.log(show([1, 2].join("-")));
  console.log(show([1, 2].join("") + [1, 2].length.toString()));
  console.log(show([null, undefined].join("-")));
  console.log(show(holes.join("-")));
  console.log(show([1, [2, [3]]].join("|")));
  console.log(show([1, 2, 3].toString()));
  console.log(show([[1, 2], [3]].toString()));
  console.log(show([1, 2].toLocaleString()));
  console.log(show(String(new Array(3))));
  console.log(show(String([, 1])));
  console.log(show(JSON.stringify([, 1])));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
