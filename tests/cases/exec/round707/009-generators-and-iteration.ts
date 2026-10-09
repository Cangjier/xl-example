// xl:title 生成器与迭代：return 与 finally、`yield*` 委托、throw 进 try、next 的实参、迭代器的来源
// xl:round 788
// xl:judge stdout
// xl:end
// **按判定点并组（第 788 轮）**：吸收 `exec/round707` 里逐条一问的 10 条探针
// （`p707b-g01` … `p707b-g10`）。正文逐字搬进各自的 IIFE。
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

(() => {
  function* g() { try { yield 1; yield 2; } finally { console.log("fin"); } }
  const it = g();
  console.log(show(it.next().value));
  console.log(show(it.return(9).value) + "," + show(it.return(9).done));
})();
(() => {
  function* inner() { yield 1; yield 2; }
  function* outer() { yield 0; yield* inner(); yield 3; }
  console.log(show([...outer()].join("|")));
})();
(() => {
  function* g() { try { yield 1; } catch (e) { console.log("caught:" + e); } }
  const it = g(); it.next(); it.throw("X");
})();
(() => {
  function* g() { yield 1; }
  const it = g();
  console.log(show(it[Symbol.iterator]() === it));
})();
(() => {
  async function* g() { yield 1; }
  const it = g();
  console.log(show(typeof it.next) + "," + show(typeof it[Symbol.asyncIterator]));
})();
(() => {
  function* g() { const v = yield 1; console.log(show(v)); }
  const it = g(); it.next(); it.next(42);
})();
(() => {
  function* g() { yield 1; }
  const it = g(); it.next();
  console.log(show(JSON.stringify(it.next())));
})();
(() => {
  console.log(show([...new Map([["a", 1]])].map((p) => p.join(":")).join("|")));
  console.log(show([..."ab"].join("|")) + "," + show([...new Set([1, 2])].join("|")));
})();
(() => {
  const o = { [Symbol.iterator]() { let i = 0; return { next: () => (i < 2 ? { value: i++, done: false } : { value: undefined, done: true }) }; } };
  console.log(show([...o].join("|")));
})();
(() => {
  const [a, b] = new Set([1, 2]);
  console.log(show(a) + "," + show(b));
})();
