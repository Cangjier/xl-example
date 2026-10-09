// xl:title `Map` / `Set`：迭代中删改的可见性
// xl:round 748
// xl:judge stdout
// xl:want differ
// xl:why `for…of` 一个**遍历中改动**的 `Map` / `Set`：JS 的迭代器是**活的**——
// xl:why 删掉的那一格**跳过**、新加的**看得见**（Node 给 `a1,c3,d4` + `a,c,d`），
// xl:why 本仓给 `a1,b2,c3`（删掉的照样喂出去、新加的看不见）。
// xl:why **这是已登记的那条根**（`stdlib/map-set/110-forof-live-view-not-taken`，第 687 轮）：
// xl:why `Map.keys()` / `Set.values()` 交出来的是**一份快照数组**（`map.xl.md` / `set.xl.md`
// xl:why 那三支 + `AttachArrayIterator`），而 `for..of` / 展开 / `Array.from` / 解构**都先过
// xl:why `GetIterator`**（`install.xl.md`）——快照在**取迭代器那一刻**就定了。
// xl:why `forEach` 那一条路**早就是逐步现读**（判据 `109-mutate-during-iteration` 量着它），
// xl:why 差的正是「取迭代器」这一半：要收它得让迭代器**指向那张表本身**
// xl:why （而不是一张拷贝），是引擎迭代协议那一层的活。
// xl:why 本用例把**两个方向**（删掉 / 新加）钉在同一份语料里，`for…of` 与 `m.keys()` 都盖到。
// xl:end
const m = new Map([["a", 1], ["b", 2], ["c", 3]]);
const seen: string[] = [];
for (const [k, v] of m) { seen.push(k + v); if (k === "a") m.delete("b"); if (k === "c") m.set("d", 4); }
console.log(seen.join(","), [...m.keys()].join(","));
const s = new Set([1, 2, 3]);
const seen2: number[] = [];
for (const v of s) { seen2.push(v); if (v === 1) s.delete(2); if (v === 3) s.add(4); }
console.log(seen2.join(","), [...s].join(","));
