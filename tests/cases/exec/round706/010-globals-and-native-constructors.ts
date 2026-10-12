// xl:title 全局对象与内建构造器：globalThis / Object() / Array() 的形状
// xl:round 789
// xl:judge stdout
// xl:end
// **按判定点并组（第 789 轮）**：吸收 exec/round706 里逐条一问的 8 条探针
// （p706a-f03 · p706a-f04 · p706a-f05 · p706a-p01 · p706a-p02 · p706a-p03 · p706a-p04 · p706a-p05）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// globalThis 与 Math、Object() / Array() 的裸调用、Object.assign 接字符串、原始值的原型与装箱

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 p706a-f03.ts（第 706 轮）
(() => {
  console.log(show(typeof Object()) + "," + show(JSON.stringify(Object())) + "," + show(Object() instanceof Object));
})();

// 吸收 p706a-f04.ts（第 706 轮）
(() => {
  console.log(show(Array().length) + "," + show(Array(3).length) + "," + show(JSON.stringify(Array(3))));
})();

// 吸收 p706a-f05.ts（第 706 轮）
(() => {
  console.log(show(typeof globalThis.parseInt) + "," + show(globalThis.Math === Math));
})();

// 吸收 p706a-p01.ts（第 706 轮）
(() => {
  console.log(show(JSON.stringify(Object.assign({}, "ab"))));
})();

// 吸收 p706a-p02.ts（第 706 轮）
(() => {
  console.log(show(JSON.stringify(Object.assign({}, "ab"))) + "," + show(Object.keys("ab").join("|")));
})();

// 吸收 p706a-p03.ts（第 706 轮）
(() => {
  run(() => { console.log(show(Object.keys(null))); });
})();

// 吸收 p706a-p04.ts（第 706 轮）
(() => {
  console.log(show(Object.getPrototypeOf(1) === Number.prototype));
})();

// 吸收 p706a-p05.ts（第 706 轮）
(() => {
  console.log(show(Object.getPrototypeOf("abc") === String.prototype));
})();
