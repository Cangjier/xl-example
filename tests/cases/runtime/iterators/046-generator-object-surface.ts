// xl:title 生成器对象自己那一格：typeof / next·return·throw 与 Symbol.iterator / 自有名表
// xl:round 790
// xl:judge stdout
// xl:end
// **按判定点并组（第 790 轮）**：吸收 runtime/iterators 里同判定点的 11 条用例
// （033-generator-instanceof · 025-generator-object-identity · probe705-i-c03 · probe705-i-c07 · probe693b-g08 · probe693b-g12 · probe694-g18 · probe694-g24 · probe694-g27 · probe695-g07 · probe695-g10）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// 迭代器是对象、三个方法都在、@@iterator 返回自己、自有名表为空、done 之后不再变

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 033-generator-instanceof.ts（第 683 轮）
(() => {
  function* g() { yield 1; }
  const it: any = g();
  try { console.log("typeof", String(typeof it)); } catch (e) { console.log("typeof", "ERR", String(e && e.name)); }
  try { console.log("has-next", String(typeof it.next)); } catch (e) { console.log("has-next", "ERR", String(e && e.name)); }
  try { console.log("has-return", String(typeof it.return)); } catch (e) { console.log("has-return", "ERR", String(e && e.name)); }
  try { console.log("has-throw", String(typeof it.throw)); } catch (e) { console.log("has-throw", "ERR", String(e && e.name)); }
  try { console.log("symbol-iterator", String(typeof it[Symbol.iterator])); } catch (e) { console.log("symbol-iterator", "ERR", String(e && e.name)); }
  try { console.log("self-iterable", String(it[Symbol.iterator]() === it)); } catch (e) { console.log("self-iterable", "ERR", String(e && e.name)); }
})();

// 吸收 025-generator-object-identity.ts（第 7 轮）
(() => {
  function* g() { yield 1; }
  const it = g();
  console.log(typeof it.next, it[Symbol.iterator]() === it);
  console.log(JSON.stringify(it.next()), JSON.stringify(it.next()), JSON.stringify(it.next()));
  console.log([...g()].join(","), JSON.stringify([...g()]));
})();

// 吸收 probe705-i-c03.ts（第 705 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function* g() { yield 1; yield 2; }) && "ok"));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe705-i-c07.ts（第 705 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function* () { const x = yield 1; return x; })() && "ok"));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-g08.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function* g() { yield 1; } const it = g(); it.next(); return typeof it.throw; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-g12.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function* g() { yield 1; } const it = g(); return typeof it[Symbol.iterator]; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe694-g18.ts（第 694 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { return typeof [][Symbol.iterator]().next; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe694-g24.ts（第 694 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function* g() { yield 1; } const it = g(); it.next(); return typeof it.next; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe694-g27.ts（第 694 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function* g() { yield 1; } return typeof g()[Symbol.iterator]; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe695-g07.ts（第 695 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function* g() { yield 1; } return typeof g().next; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe695-g10.ts（第 695 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function* g() { yield 1; } return Object.keys(g()).length; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
