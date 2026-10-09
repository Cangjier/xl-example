// xl:title Set 的 `Symbol.iterator` 那一格：与 `values` 是同一格、`next()` 给值
// xl:round 712
// xl:judge stdout
// xl:end
// 第 802 轮改名（原 `p712a-a01`；正文一字未动，只把轮次从标题挪回 `xl:round`）。
// 判定点只有一个：**Set 的迭代器表面**——`s[Symbol.iterator]` 是函数、
// 与 `Set.prototype.values` 是同一格、调一次 `next()` 交出第一个元素。
// （数组 / `Map` 的同一族在 `exec/round711/002-array-iterator-surface`，那是另外两格。）
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  const s = new Set([1, 2]);
  const it: any = (s as any)[Symbol.iterator]();
  const first = it.next().value;
  const second = new Set([1]).values;
  console.log(show(typeof (s as any)[Symbol.iterator]) + "," + show(first) + ","
    + ((s as any)[Symbol.iterator] === second));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
