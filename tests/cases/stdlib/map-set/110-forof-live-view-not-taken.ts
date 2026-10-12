// xl:title `for…of` 一个遍历中长大的 Map：看不见新加的键（按名字那只活在 `forEach` 上）
// xl:round 687
// xl:judge stdout
// xl:want differ
// xl:why `for (const k of m.keys())` 走的是 `for..of` 那条**惰性**路（`IterNew` + `iter_next`），
//       而这一层的 `Map.keys()` / `Set.values()` 交出来的是**一份快照数组**
//       （`map.xl.md` / `set.xl.md` 那三支，`AttachArrayIterator` 把 `next` 挂在这个数组上）——
//       快照在**取迭代器那一刻**就定了，所以遍历中 `m.set("c", 3)` 进去的键一层都走不到
//       （Node 给 "a,b,c"）。`forEach` 那一条路**已经**是每一步现读（判据
//       `109-mutate-during-iteration` 量着它），差的是「取迭代器」这一半：
//       要收它得让迭代器**指向那张表本身**（而不是一张拷贝），是引擎迭代协议那一层的活。
// xl:end

const m = new Map<string, number>();
m.set("a", 1);
m.set("b", 2);
const keyOrder: string[] = [];
for (const k of m.keys()) {
  keyOrder.push(k);
  if (k === "a") m.set("c", 3);
}
console.log("map-keys-add", keyOrder.join(","));

const s = new Set<number>();
s.add(1);
s.add(2);
const valueOrder: number[] = [];
for (const v of s.values()) {
  valueOrder.push(v);
  if (v === 1) s.add(3);
}
console.log("set-values-add", valueOrder.join(","));
