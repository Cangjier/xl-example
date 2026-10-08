// xl:title 迭代中改集合：`for..of` 的活视图与 `forEach` 的快照
// xl:round 752
// xl:judge stdout
// xl:want differ
// xl:why **`for..of` 遍历中改 `Set` / `Map`：新加进去的元素该被走到**（Node 给 `1,2,3,9` / `1,2,9`），
// xl:why 本仓给 `1,2,3` / `1,2`——**迭代器是一次快照**。
// xl:why **同一条根的第 N 个落点**：`stdlib/map-set/110-forof-live-view-not-taken`、
// xl:why `runtime/round748/p748b-b01`（那一轮把「删掉」与「新加」两个方向钉在一起）都登过，
// xl:why 这一条把 `Set` 与 `Map` **两族**、以及**「`forEach` 是快照、`for..of` 是活的」这条对照**
// xl:why （Node 里 `forEach` 给 `1,2,3`——它按规范就是快照）一起钉住。
// xl:why **为什么一直没做**：本仓的 `Set` / `Map` 迭代器**就是一个数组**（`keys()` 先把内容抄出来，
// xl:why 见 `set.xl.md` / `map.xl.md` 那一支），而「活视图」要的是**每次 `next()` 回去读集合**
// xl:why （还要处理「删掉当前项」「清空」「重新加回同一格」三种时机）——
// xl:why 那是换掉迭代器的表示，与第 712 / 748 轮那两条同属一件活。
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('(function () { const s =', show(() => (function () { const s = new Set([1,2,3]); const out: number[] = []; for (const x of s) { out.push(x); if (x === 1) s.add(9); } return out.join(","); })()));
console.log('(function () { const s =', show(() => (function () { const s = new Set([1,2,3]); const out: number[] = []; s.forEach((x) => { out.push(x); if (x === 1) s.add(9); }); return out.join(","); })()));
console.log('(function () { const m =', show(() => (function () { const m = new Map([[1,1],[2,2]]); const out: number[] = []; for (const [k] of m) { out.push(k); if (k === 1) m.set(9, 9); } return out.join(","); })()));
