// xl:title 回调族对**洞**的口径：跳过、算 `undefined`，还是两个都算
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的二十余条**：
//   probe693-a16 · probe693-a17 · probe693-a55 · probe696-h04 · probe696-h05 ·
//   probe696-h06 · probe696-h07 · probe696-h08 · probe696-h09 · probe696-h10 ·
//   probe696-h11 · probe696-h22 · probe696-r47 · probe696-r49 · p-arr-map-keeps-hole
//   ＋ `013-array-sparse-iteration` / `082-array-holes-per-method` / `090-array-holes`
//     / `120-array-callbacks-holes` / `148-array-holes-foreach-map` / `119-sort-edges`（无关那一半）
//
// 判定点只有一个：**洞在「回调族」与「取值族」里是两回事**——
//  ① 回调族（`map` / `forEach` / `filter` / `some` / `every` / `reduce`）**跳过洞**（回调不跑）；
//  ② 但 `map` / `filter` 的结果里**洞还在**（`map` 不补格）；
//  ③ 取值族（`join` / `includes` / 展开 / `Array.from`）把洞当 `undefined`（给空串 / 给真 / 补格）；
//  ④ `Object.keys` / `Object.entries` 不算洞那一格。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
const holes: any = [, 1];

try {
  console.log(show(holes.map((v: any) => String(v)).join("|")));
  console.log(show(holes.map((v: any) => String(v)).length));
  console.log(show([, ,].map((x: any) => x).join("|")));
  console.log(show([1, , 3].map((x: any) => x * 2).length));
  console.log(show(holes.filter(() => true).length));
  console.log(show(holes.filter((v: any) => true).length));
  let n = 0;
  holes.forEach(() => { n++; });
  console.log(show(n));
  console.log(show([1, , 3].reduce((a: any, b: any) => a + b)));
  console.log(show([1, , 3].reduce((a: any, b: any) => a + b, 0)));
  console.log(show(holes.length));
  console.log(show(0 in holes));
  console.log(show([...(holes as any[])].length));
  console.log(show(([...(holes as any[])] as any[])[0]));
  console.log(show(Object.keys(holes).join(",")));
  console.log(show(Object.entries(holes).length));
  console.log(show(holes.includes(undefined)));
  console.log(show(holes.join("-")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
