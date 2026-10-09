// xl:title Symbol 的面：for / keyFor / description / 符号键与 toStringTag
// xl:round 789
// xl:judge stdout
// xl:end
// **按判定点并组（第 789 轮）**：吸收 exec/round706 里逐条一问的 5 条探针
// （p706a-s01 · p706a-s02 · p706a-s03 · p706a-s04 · p706a-s05）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// Symbol.for 的同一性、keyFor 的两档、description 与 toString、符号键不进 Object.keys、Symbol.toStringTag

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 p706a-s01.ts（第 706 轮）
(() => {
  console.log(show(Symbol.for("k") === Symbol.for("k")) + "," + show(typeof Symbol("k").description));
})();

// 吸收 p706a-s02.ts（第 706 轮）
(() => {
  console.log(show(Symbol.keyFor(Symbol.for("kk"))) + "," + show(Symbol.keyFor(Symbol("kk"))));
})();

// 吸收 p706a-s03.ts（第 706 轮）
(() => {
  console.log(show(typeof Symbol("s")) + "," + show(Symbol("s").toString()) + "," + show(Symbol("s").description));
})();

// 吸收 p706a-s04.ts（第 706 轮）
(() => {
  const o = {}; const s = Symbol("s"); o[s] = 1;
  console.log(show(o[s]) + "," + show(Object.getOwnPropertySymbols(o)[0] === s) + "," + show(Object.keys(o).length));
})();

// 吸收 p706a-s05.ts（第 706 轮）
(() => {
  const o = { [Symbol.toStringTag]: "T" };
  console.log(show(Object.prototype.toString.call(o)));
})();
