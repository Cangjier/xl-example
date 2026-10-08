// xl:title 下标上的访问器：展开与 for..of 该调 getter
// xl:round 721
// xl:judge stdout
// xl:want differ
// xl:why 同上：`[...a]` / `Array.from(a)` **读元素区**（数组迭代器挂的是元素那一摞），
// xl:why 所以下标上的 getter 在展开这条路里也调不到。
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperty(a, "1", { get() { return 99; }, enumerable: true, configurable: true });
console.log(show([...a].join(",")) + "|" + show(Array.from(a).join(",")));
