// xl:title 块里的函数声明在松散模式下的提升（账）
// xl:round 789
// xl:judge stdout
// xl:want differ
// xl:why probe693b-s30：**块里的函数声明**（`{ function g() {} }`）在松散模式下按 Annex B **提升到函数作用域**（JS 里块外 `typeof g` 给 `"function"`），本仓只在块内可见 ⇒ 给 `"undefined"`（**静默错值**）。要做。
// xl:end
// **按判定点并组（第 789 轮（三））**：吸收 exec/statements 里逐条一问的 1 条探针
// （probe693b-s30）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// Annex B：JS 里块外 typeof g 给 "function"，本仓只在块内可见 ⇒ 给 "undefined"（静默错值）

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 probe693b-s30.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { for (let i = 0; i < 1; i++) { function g() { return 1; } } return typeof g; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
