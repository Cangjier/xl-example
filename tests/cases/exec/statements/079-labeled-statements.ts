// xl:title 带标签的语句：块 / if / while / try / switch / for-of / do-while 上的 break
// xl:round 789
// xl:judge stdout
// xl:end
// **按判定点并组（第 789 轮（三））**：吸收 exec/statements 里逐条一问的 10 条探针
// （probe693b-s20…25 · probe693b-s27…29 · probe701-c-e11）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// 标签可以贴在任意语句上；break 标签跳出之后从标签后面继续

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 probe693b-s20.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { let s = ""; a: b: for (let i = 0; i < 2; i++) { s += i; break a; } return s; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-s21.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { let s = ""; lbl: { s += "a"; break lbl; } s += "b"; return s; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-s22.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { let s = ""; lbl: if (true) { s += "a"; break lbl; } s += "b"; return s; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-s23.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { let s = ""; lbl: while (true) { s += "a"; break lbl; } s += "b"; return s; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-s24.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { let s = ""; lbl: try { s += "a"; break lbl; } finally { s += "f"; } s += "b"; return s; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-s25.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { lbl: { break lbl; } return "after"; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-s27.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { let s = ""; lbl: for (const x of [1, 2]) { s += x; break lbl; } s += "z"; return s; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-s28.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { let s = ""; lbl: do { s += "a"; break lbl; } while (true); s += "b"; return s; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-s29.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { let s = ""; lbl: { { s += "a"; break lbl; } s += "no"; } return s; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe701-c-e11.ts（第 701 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { let s = ''; a: { s += 'in'; break a; s += 'no'; } return s; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
