// xl:title Map / Set：构造与插入序、NaN 与 -0 键、get / has / delete、Map.groupBy、WeakMap 的键
// xl:round 788
// xl:judge stdout
// xl:end
// **按判定点并组（第 788 轮）**：吸收 `exec/round707` 里逐条一问的 8 条探针
// （`p707a-m01` … `p707a-m08`）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

(() => {
  const m = new Map([["b", 2], ["a", 1]]);
  console.log(show([...m.keys()].join("|")) + "," + show([...m.values()].join("|")) + "," + show(m.size));
})();
(() => {
  const m = new Map(); m.set(NaN, "nan"); m.set(0, "zero");
  console.log(show(m.get(NaN)) + "," + show(m.get(-0)) + "," + show(m.size));
})();
(() => {
  const m = new Map();
  console.log(show(m.get("x")) + "," + show(m.has("x")));
})();
(() => {
  const r = Map.groupBy([1, 2, 3], (x) => (x % 2 === 0 ? "e" : "o"));
  console.log(show(r instanceof Map) + "," + show(JSON.stringify([...r]) ));
})();
(() => {
  const s = new Set([3, 1, 3, 2]);
  console.log(show([...s].join("|")) + "," + show(s.size));
})();
(() => {
  const s = new Set([1, 2]); s.delete(1);
  console.log(show(s.has(1)) + "," + show(s.size));
})();
(() => {
  const m = new Map([["a", 1]]);
  console.log(show(m.delete("a")) + "," + show(m.delete("a")) + "," + show(m.size));
})();
(() => {
  run(() => { const w = new WeakMap(); w.set(1, 2); console.log(show(w.get(1))); });
})();
