// xl:title 内建可迭代物的迭代器：数组 / 字符串 / Map / Set 的 entries·keys·values
// xl:round 790
// xl:judge stdout
// xl:end
// **按判定点并组（第 790 轮）**：吸收 runtime/iterators 里同判定点的 21 条用例
// （probe693b-g13 · probe693b-g14 · probe693b-g15 · probe693b-g21 · probe694-g11 · probe694-g12 · probe694-g13 · probe694-g14 · probe694-g15 · probe694-g16 · probe694-g17 · probe694-g22 · probe695-g05 · probe696-i02 · probe696-i04 · probe696-i09 · probe696-i10 · probe705-i-c02 · probe705-i-c09 · probe705-i-c10 · probe705-i-c11）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// 三种迭代器各自的取值、展开与 Array.from 消费它们的样子

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 probe693b-g13.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const it = [1, 2][Symbol.iterator](); return it.next().value; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-g14.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const s = "ab"[Symbol.iterator](); return [s.next().value, s.next().done].join(","); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-g15.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const m = new Map([["a", 1]]); const it = m[Symbol.iterator](); const e = it.next().value; return e[0] + e[1]; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-g21.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const it = [1].values(); return it.next().value; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe694-g11.ts（第 694 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const it = [1, 2].entries(); return [...it].length; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe694-g12.ts（第 694 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const it = [1, 2].keys(); return [...it].join(","); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe694-g13.ts（第 694 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const it = [1, 2].values(); return [...it].join(","); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe694-g14.ts（第 694 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const s = new Set([1, 2]); return [...s.entries()].length; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe694-g15.ts（第 694 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const m = new Map([["a", 1]]); return [...m.entries()].length; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe694-g16.ts（第 694 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const m = new Map([["a", 1]]); return [...m.keys()].join(","); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe694-g17.ts（第 694 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const m = new Map([["a", 1]]); return [...m.values()].join(","); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe694-g22.ts（第 694 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const s = "ab"; return [...s].join(","); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe695-g05.ts（第 695 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function* g() { yield 1; yield 2; } return Array.from(g()).length; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe696-i02.ts（第 696 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Array.from("ab").join("|")));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe696-i04.ts（第 696 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const it = [1, 2][Symbol.iterator](); return typeof it.next; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe696-i09.ts（第 696 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const s = new Set([1, 2]); return Math.max(...s); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe696-i10.ts（第 696 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const m = new Map([[1, "a"]]); return [...m.keys()].join(","); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe705-i-c02.ts（第 705 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Array.from([1, 2]).length));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe705-i-c09.ts（第 705 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show([...new Set([1, 1, 2])].length));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe705-i-c10.ts（第 705 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("a" in Object.fromEntries([["a", 1]])));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe705-i-c11.ts（第 705 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show([...("abc")].join(",")));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
