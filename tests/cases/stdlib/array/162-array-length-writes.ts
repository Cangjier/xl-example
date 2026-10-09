// xl:title 数组的 `length`：截断、放大成洞、越界赋值与不可写那一档
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的二十余条**：
//   probe693-a12 · probe693-a13 · probe693-a14 · probe693-a15 · probe693-a47 ·
//   probe693-a48 · probe693-a49 · probe693-a58 · probe703-a-b19 · probe703-a-b18 ·
//   probe703-a-b50
//   ＋ `012-array-length-write` / `042-array-length-shrink-and-grow` / `060-array-length-nonwritable`
//     / `078-array-length-write-forms` / `084-array-length-range` / `130-array-ctor-holes`
//     / `141-length-nonwritable-array` / `p-arr-length-truncate`
//
// 判定点只有一个：**`length` 那一格与下标格的联动**——
//  ① 写小：**真删掉**后面那些格（`join` 跟着短，`length` 是写的那个数）；
//  ② 写大：中间那一段变成**洞**（`in` 假、`join` 给空串、`length` 是写的那个数）；
//  ③ 越界赋值 `a[5] = 6` 把 `length` 顶到 6；负下标 / 非下标字符串键**不动** `length`；
//  ④ 非法值（负数 / 小数 / 超过 2^32-1）抛 `RangeError`；
//  ⑤ `length` 被设成不可写之后 `push` 抛 `TypeError`。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
const err = (f: () => any): string => {
  try { return "no-throw:" + String(f()); } catch (e) { return (e as any).constructor.name; }
};

try {
  const cut: any = [1, 2, 3];
  cut.length = 1;
  console.log(show(cut.join(",") + "|" + cut.length));
  const grow: any = [1];
  grow.length = 3;
  console.log(show(grow.join(",") + "|" + (1 in grow)));
  const zero: any = [1, 2, 3];
  zero.length = 0;
  console.log(show(zero.join(",") + zero.length));
  const del: any = [1, 2, 3];
  delete del[1];
  console.log(show(del.join(",") + "|" + del.length));
  const long: any = [1, 2];
  long[5] = 6;
  console.log(show(long.length));
  const neg: any = [];
  neg[-1] = 1;
  console.log(show(neg.length + "," + neg[-1]));
  const str: any = [1, 2];
  str["1"] = 9;
  console.log(show(str.join(",") + "|" + str.length));
  console.log(show(err(() => { const a: any = [1]; a.length = -1; return a.length; })));
  console.log(show(err(() => { const a: any = [1]; a.length = 1.5; return a.length; })));
  console.log(show(err(() => { const a: any = [1]; a.length = 4294967296; return a.length; })));
  console.log(show(err(() => {
    const a: any = [1];
    Object.defineProperty(a, "length", { writable: false });
    a.push(2);
    return a.length;
  })));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
