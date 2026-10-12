// xl:title `for...of` 遍历 Map 时删除 / 追加
// xl:round 790
// xl:judge stdout
// xl:want differ
// xl:why `for...of` 遍历 `Map` 时**新加的键该被看见**（Map 的迭代器是**活视图**：
//       每走一步现读当下那一份）。本仓的 `for..of` 走的是**惰性**路
//       （`IterNew` + `iter_next`），长度被快照一次 ⇒ 中途 `set("d", 4)` 看不见。
//       与 `stdlib/map-set/110-forof-live-view-not-taken` 是**同一条根**
//       （那一条量的是 `m.keys()`，这一条量的是 `for..of` 本身）。要做。
// xl:end
const m: any = new Map<any, any>([["a", 1], ["b", 2], ["c", 3]]);
const seen: string[] = [];
for (const [k] of m) {
  seen.push(k);
  if (k === "a") { m.delete("c"); m.set("d", 4); }
}
console.log(seen.join(","), m.size);
