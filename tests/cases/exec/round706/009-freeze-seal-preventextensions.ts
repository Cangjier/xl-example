// xl:title 冻结 / 密封 / 不可扩展：返回值、is* 三问与失败的写法
// xl:round 789
// xl:judge stdout
// xl:end
// **按判定点并组（第 789 轮）**：吸收 exec/round706 里逐条一问的 7 条探针
// （p706a-o01 · p706a-o03 · p706a-o04 · p706a-o05 · p706a-o06 · p706a-o07 · p706a-o08）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// freeze 返回实参本身、seal 与 preventExtensions 的 is* 三问、访问器在冻结之后照读

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 p706a-o01.ts（第 706 轮）
(() => {
  const o = { a: 1 }; Object.freeze(o);
  run(() => { o.a = 2; console.log(show(o.a)); });
})();

// 吸收 p706a-o03.ts（第 706 轮）
(() => {
  const o = { a: 1 }; Object.seal(o);
  console.log(show(Object.isSealed(o)) + "," + show(Object.isFrozen(o)) + "," + show(Object.isExtensible(o)));
})();

// 吸收 p706a-o04.ts（第 706 轮）
(() => {
  const o = {}; Object.preventExtensions(o);
  run(() => { o.a = 1; console.log(show(Object.keys(o).length)); });
})();

// 吸收 p706a-o05.ts（第 706 轮）
(() => {
  console.log(show(Object.isFrozen({})) + "," + show(Object.isSealed(Object.freeze({}))));
})();

// 吸收 p706a-o06.ts（第 706 轮）
(() => {
  const o = Object.freeze({ get a() { return 7; } });
  console.log(show(o.a));
})();

// 吸收 p706a-o07.ts（第 706 轮）
(() => {
  const o = {}; console.log(show(Object.freeze(o) === o));
})();

// 吸收 p706a-o08.ts（第 706 轮）
(() => {
  run(() => { console.log(show(Object.isExtensible(Object.preventExtensions({})))); });
})();
