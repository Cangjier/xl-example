// xl:title 迭代器与生成器：Map 条目、Set 展开、forEach 次序、生成器的 return 与标签、async 的形状
// xl:round 788
// xl:judge stdout
// xl:end
// **按判定点并组（第 788 轮）**：吸收 `exec/round710` 里逐条一问的 10 条探针
// （`p710c-c01` · `c03` … `c10` · `c12`）。正文逐字搬进自己的 `probe(f)` 小壳。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const probe = (f) => {
  try {
    console.log(show(f()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
};

probe(() => (function () { const m = new Map([["a", 1]]); const it: any = (m as any)[Symbol.iterator](); const e = it.next().value; return e[0] + e[1]; })());
probe(() => [...(new Set([1, 2]) as any)].join(","));
probe(() => { let out = ""; new Map([["a", 1], ["b", 2]]).forEach((v, k) => { out = out + k + v; }); return out; });
probe(() => (function () { function* g() { yield 1; yield 2; } const it: any = g(); it.next(); return it.return(7).value; })());
probe(() => (function () { function* g() {} return Object.prototype.toString.call(g()); })());
probe(() => typeof (async function () {}).prototype);
probe(() => (async () => {}).constructor.name);
probe(() => (function* () {}).constructor.name);
probe(() => (function () { function* g() { yield 1; yield 2; } return [...(g() as any)].join(","); })());
probe(() => new Map([[1, 2]]).size);
