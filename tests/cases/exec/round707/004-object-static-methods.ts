// xl:title Object 的静态族：assign / fromEntries / groupBy / create / setPrototypeOf / is / values / entries
// xl:round 788
// xl:judge stdout
// xl:end
// **按判定点并组（第 788 轮）**：吸收 `exec/round707` 里逐条一问的 19 条探针
// （`p707a-o01` … `p707a-o15` · `p707c-o01` · `p707c-o03` · `p707c-o04` · `p707c-o05`）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// Object.assign 的落点与取值口径
(() => {
  const o = Object.assign({}, { a: 1 }, { b: 2 });
  console.log(show(JSON.stringify(o)));
})();
(() => {
  const a = Object.assign([], [1, 2]);
  console.log(show(a.length) + "," + show(JSON.stringify(a)));
})();
// assign 到数组目标：`Object.keys` 跟着走、来源有洞、来源是数字键的对象
(() => {
  const a = Object.assign([], [1, 2]);
  console.log(show(a.length) + "," + show(JSON.stringify(a)) + "," + show(Object.keys(a).join("|")));
})();
(() => {
  const a = Object.assign([], [1, , 3]);
  console.log(show(a.length) + "," + show(JSON.stringify(a)));
})();
(() => {
  const a = Object.assign([], { 2: "c" });
  console.log(show(a.length) + "," + show(JSON.stringify(a)) + "," + show(Object.keys(a).join("|")));
})();
(() => {
  const o = Object.assign({}, [1, 2]);
  console.log(show(JSON.stringify(o)));
})();
(() => {
  console.log(show(JSON.stringify(Object.assign({ a: 1 }, null, undefined))));
})();
(() => {
  const s = { get a() { return 7; } };
  console.log(show(JSON.stringify(Object.assign({}, s))));
})();
(() => {
  const s = {}; Object.defineProperty(s, "h", { value: 1, enumerable: false }); s.v = 2;
  console.log(show(JSON.stringify(Object.assign({}, s))));
})();
// Object.fromEntries / groupBy
(() => {
  console.log(show(JSON.stringify(Object.fromEntries([["a", 1], ["b", 2]]))));
})();
(() => {
  const m = new Map([["a", 1]]);
  console.log(show(JSON.stringify(Object.fromEntries(m))));
})();
(() => {
  console.log(show(JSON.stringify(Object.fromEntries([[1, "one"]]))));
})();
(() => {
  const r = Object.groupBy([1, 2, 3, 4], (x) => (x % 2 === 0 ? "even" : "odd"));
  console.log(show(JSON.stringify(r)) + "," + show(Object.getPrototypeOf(r) === null));
})();
// Object.create / setPrototypeOf
(() => {
  const o = Object.create(null); o.a = 1;
  console.log(show(Object.getPrototypeOf(o)) + "," + show(JSON.stringify(o)) + "," + show("toString" in o));
})();
(() => {
  const o = Object.create({ inherited: 1 }, { own: { value: 2, enumerable: true } });
  console.log(show(o.inherited) + "," + show(Object.keys(o).join("|")));
})();
(() => {
  const p = { g() { return 1; } }; const o = {};
  Object.setPrototypeOf(o, p);
  console.log(show(o.g()) + "," + show(Object.getPrototypeOf(o) === p));
})();
// Object.is 与取值族
(() => {
  console.log(show(Object.is(NaN, NaN)) + "," + show(Object.is(0, -0)) + "," + show(NaN === NaN) + "," + show(0 === -0));
})();
(() => {
  const o = { get a() { return 1; }, b: 2 };
  console.log(show(Object.values(o).join("|")));
})();
(() => {
  console.log(show(JSON.stringify(Object.entries({ b: 1, a: 2 }))));
})();
