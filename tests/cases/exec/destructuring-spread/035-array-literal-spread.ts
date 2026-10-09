// xl:title 数组字面量里的展开：次序、长度、可迭代物（字符串 / Set / Map）
// xl:round 792
// xl:judge stdout
// xl:end
// **按判定点并组（第 792 轮）**：把 exec/destructuring-spread 里同一个判定点的 7 条并成这一条
// （保留 019-spread-copy；吸收 021-spread-string-array · probe2-e09 · probe693b-d14 · probe693b-d18 · probe693b-d29 · probe693b-d30）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// 展开是**逐元素拷进新数组**（不是引用）；类数组与可迭代物两档各问一次

// 保留条本身：019-spread-copy.ts
(() => {
  const src: any = [1, 2, 3];
  const copy: any = [...src];
  copy.push(4);
  try { console.log("array-copy", String(src.join(',') + '|' + copy.join(','))); } catch (e) { console.log("array-copy", "ERR", String(e && e.name)); }
  try { console.log("object-order", String((() => { const log: string[] = []; const a: any = { get x() { log.push('a'); return 1; } }; const b: any = { ...a, y: (log.push('b'), 2) }; return log.join(',') + '|' + b.x + b.y; })())); } catch (e) { console.log("object-order", "ERR", String(e && e.name)); }
  try { console.log("string-spread", String([...'ab'].join('-'))); } catch (e) { console.log("string-spread", "ERR", String(e && e.name)); }
  try { console.log("spread-into-call", String(Math.max(...[1, 9, 3]))); } catch (e) { console.log("spread-into-call", "ERR", String(e && e.name)); }
  try { console.log("spread-with-holes", String(String([...[1, , 3]].length))); } catch (e) { console.log("spread-with-holes", "ERR", String(e && e.name)); }
})();

// 吸收 021-spread-string-array.ts
(() => {
  console.log(JSON.stringify([..."ab"]));
  console.log(JSON.stringify(Array.from({ 0: "a", 1: "b", length: 2 } as any)));
  function f(...xs: any[]): number { return xs.length; }
  console.log(f(..."abc"));
})();

// 吸收 probe2-e09.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const a = [1, 2]; const b = [...a, 3]; return b.join(","); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-d14.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const a = [1, 2]; return [...a, 3].join(","); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-d18.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const a = [0, ...[1, 2], 3]; return a.length; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-d29.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const s = new Set([1, 2]); return [...s].join(","); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-d30.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const m = new Map([["a", 1]]); return [...m].length; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
