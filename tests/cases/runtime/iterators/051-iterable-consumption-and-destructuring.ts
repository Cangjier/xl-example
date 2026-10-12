// xl:title 迭代消费：展开 / Array.from / 解构与剩余元素
// xl:round 790
// xl:judge stdout
// xl:end
// **按判定点并组（第 790 轮）**：吸收 runtime/iterators 里同判定点的 21 条用例
// （002-gen-forof-spread · 030-generator-spread · 043-function-function-g-yield-1-const-a-g-return-a · 044-function-function-g-yield-1-const-0-a-g-return-a · probe693b-g18 · probe693b-g19 · probe694-g09 · probe694-g28 · probe694-g29 · probe695-g02 · probe695-g04 · probe695-g09 · probe696-i03 · probe696-i07 · probe696-i08 · probe705-i-c04 · probe705-i-c13 · probe705-i-c17 · probe705-i-c18 · probe705-i-c19 · probe705-i-c20）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// 展开把可迭代物摊平、Array.from 与数组解构各走一遍、生成器被解构时只取到 yield 的值

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 002-gen-forof-spread.ts
(() => {
  function* nums(): any { yield 1; yield 2; yield 3; }
  console.log([...nums()].join(","));
  let s = 0;
  for (const v of nums()) s += v;
  console.log(s);
  const [a, b] = nums();
  console.log(a, b, Array.from(nums()).length);
})();

// 吸收 030-generator-spread.ts（第 682 轮）
(() => {
  function* g2() { yield 1; yield 2; yield 3; }
  try { console.log("spread", String([...g2()].join(','))); } catch (e) { console.log("spread", "ERR", String(e && e.name)); }
  try { console.log("from", String(Array.from(g2()).join(','))); } catch (e) { console.log("from", "ERR", String(e && e.name)); }
  try { console.log("early-return", String((() => { const it: any = g2(); const first = it.next().value; const done = it.return(9); return first + ':' + done.value + ':' + done.done + ':' + it.next().done; })())); } catch (e) { console.log("early-return", "ERR", String(e && e.name)); }
})();

// 吸收 043-function-function-g-yield-1-const-a-g-return-a.ts（第 693 轮）
(() => {
  // **合并了原先逐字节相同的 2 条**（同一件事被逐批重抄的结果）：
  //   · runtime/iterators/probe693b-g22.ts
  //   · runtime/iterators/probe696-i05.ts
  // 判定点只有一个：正文那一句表达式（期望值由真 `node` 现给，打印口径钉成 `typeof:值`）。
  // 被吸收的那几条的正文与本条**逐字节相同**，所以合并不改变任何判据。
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function* g() { yield 1; } const [a] = g(); return a; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 044-function-function-g-yield-1-const-0-a-g-return-a.ts（第 693 轮）
(() => {
  // **合并了原先逐字节相同的 3 条**（同一件事被逐批重抄的结果）：
  //   · runtime/iterators/probe693b-g23.ts
  //   · runtime/iterators/probe694-g10.ts
  //   · runtime/iterators/probe695-g03.ts
  // 判定点只有一个：正文那一句表达式（期望值由真 `node` 现给，打印口径钉成 `typeof:值`）。
  // 被吸收的那几条的正文与本条**逐字节相同**，所以合并不改变任何判据。
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function* g() { yield 1; } const { 0: a } = g(); return a; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-g18.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function* g() { yield 1; yield 2; } let s = ""; for (const v of g()) s += v; return s; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-g19.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function* g() { yield [1, 2]; } const [a, b] = g().next().value; return a + b; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe694-g09.ts（第 694 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function* g() { yield 1; } const [a, b] = g(); return String(a) + "," + String(b); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe694-g28.ts（第 694 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const a = [1, 2]; return Array.from(a[Symbol.iterator]()).join(","); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe694-g29.ts（第 694 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function* g() { yield 1; yield 2; } return Array.from(g()).join(","); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe695-g02.ts（第 695 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function* g() { yield 1; } return [...g(), ...[2]].join(","); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe695-g04.ts（第 695 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function* g() { yield 1; } const [a, b] = g(); return String(a) + String(b); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe695-g09.ts（第 695 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function* g() { yield 1; } return JSON.stringify([...g()]); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe696-i03.ts（第 696 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const [a, b] = "xy"; return a + b; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe696-i07.ts（第 696 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const o = { length: 2, 0: "a", 1: "b" }; return Array.from(o).join(","); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe696-i08.ts（第 696 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const o = { length: 2, 0: "a", 1: "b" }; return [...o].length; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe705-i-c04.ts（第 705 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show([...(function* () { yield 1; })()].length));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe705-i-c13.ts（第 705 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show([...{ length: 2 }].length));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe705-i-c17.ts（第 705 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const [a, ...r] = [1, 2, 3]; return r.length; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe705-i-c18.ts（第 705 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const { a, ...r } = { a: 1, b: 2 }; return r.b; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe705-i-c19.ts（第 705 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function (a, ...r) { return r.length; })(1, 2, 3)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe705-i-c20.ts（第 705 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function ({ a }) { return a; })({ a: 7 })));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
