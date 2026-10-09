// xl:title 语句位上的回调与生成器：map / forEach 里的 return 与 continue、for-of 消费生成器
// xl:round 789
// xl:judge stdout
// xl:end
// **按判定点并组（第 789 轮（三））**：吸收 exec/statements 里逐条一问的 4 条探针
// （probe701-c-e24…26 · probe701-c-e33）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// 回调里的 return 只结束那一次调用；for-of 走生成器

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 probe701-c-e24.ts（第 701 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const f = (x) => x * 2; return [1, 2].map(f).join(); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe701-c-e25.ts（第 701 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { let s = ''; const arr = [1, 2, 3]; arr.forEach((v, i) => { if (i === 1) return; s += v; }); return s; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe701-c-e26.ts（第 701 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const arr = [1, 2, 3]; const out = []; for (let i = 0; i < arr.length; i++) { if (i === 1) continue; out.push(arr[i]); } return out.join(); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe701-c-e33.ts（第 701 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const g = function* () { yield 1; }; let n = 0; for (const v of g()) n += v; return n; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
