// xl:title defineProperty 与键的强制转换：数字 / 字符串 / 对象键
// xl:round 789
// xl:judge stdout
// xl:end
// **按判定点并组（第 789 轮）**：吸收 exec/round706 里逐条一问的 15 条探针
// （p706a-o11 · p706a-o12 · p706a-o13 · p706a-o14 · p706a-o15 · p706a-o16 · p706b-d01 · p706b-d02 · p706b-d03 · p706b-d04 · p706b-d05 · p706b-d06 · p706b-d07 · p706b-d08 · p706c-x11）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// defineProperty 的默认描述符、数字与字符串键同格、数组下标那一格、对象键走 ToPropertyKey（登记）

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 p706a-o11.ts（第 706 轮）
(() => {
  const a = []; Object.defineProperty(a, 0, { value: 5, configurable: true });
  console.log(show(JSON.stringify(a)) + "," + show(a.length));
})();

// 吸收 p706a-o12.ts（第 706 轮）
(() => {
  const o = {}; Object.defineProperty(o, 1, { value: "v", enumerable: true });
  console.log(show(o["1"]) + "," + show(Object.keys(o).join("|")));
})();

// 吸收 p706a-o13.ts（第 706 轮）
(() => {
  const o = {}; Object.defineProperty(o, "a", { value: 1 });
  console.log(show(JSON.stringify(o)) + "," + show(Object.keys(o).length));
})();

// 吸收 p706a-o14.ts（第 706 轮）
(() => {
  console.log(show(Object.getOwnPropertyDescriptor({}, "zzz")));
})();

// 吸收 p706a-o15.ts（第 706 轮）
(() => {
  const o = { a: 1 };
  console.log(show(Object.keys(Object.getOwnPropertyDescriptors(o)).join("|")));
})();

// 吸收 p706a-o16.ts（第 706 轮）
(() => {
  const o = {}; Object.defineProperties(o, { a: { value: 1, enumerable: true }, b: { value: 2, enumerable: true } });
  console.log(show(JSON.stringify(o)));
})();

// 吸收 p706b-d01.ts（第 706 轮）
(() => {
  const o = {}; Object.defineProperty(o, 1, { value: "v", enumerable: true });
  console.log(show(o["1"]));
})();

// 吸收 p706b-d02.ts（第 706 轮）
(() => {
  const n = 1; const o = {}; Object.defineProperty(o, n, { value: "v", enumerable: true });
  console.log(show(o["1"]));
})();

// 吸收 p706b-d03.ts（第 706 轮）
(() => {
  const o = {}; Object.defineProperty(o, "1", { value: "v", enumerable: true });
  console.log(show(o[1]) + "," + show(Object.keys(o).join("|")));
})();

// 吸收 p706b-d04.ts（第 706 轮）
(() => {
  const a = []; Object.defineProperty(a, 0, { value: 5, configurable: true });
  console.log(show(JSON.stringify(a)));
})();

// 吸收 p706b-d05.ts（第 706 轮）
(() => {
  const a = []; const i = 0; Object.defineProperty(a, i, { value: 5, configurable: true });
  console.log(show(JSON.stringify(a)));
})();

// 吸收 p706b-d06.ts（第 706 轮）
(() => {
  const o = {}; Object.defineProperty(o, String(1), { value: "v", enumerable: true });
  console.log(show(o[1]));
})();

// 吸收 p706b-d07.ts（第 706 轮）
(() => {
  const o = {}; o[1] = "v";
  console.log(show(o["1"]) + "," + show(Object.keys(o).join("|")));
})();

// 吸收 p706b-d08.ts（第 706 轮）
(() => {
  const o = { 1: "v" }; console.log(show(Object.getOwnPropertyDescriptor(o, 1) !== undefined));
})();

// 吸收 p706c-x11.ts（第 706 轮）
(() => {
  const o = {}; const n = 1; Object.defineProperty(o, n, { value: "v", enumerable: true });
  console.log(show(o["1"]) + "," + show(Object.keys(o).join("|")));
})();
