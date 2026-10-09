// xl:title 稀疏数组与洞：length / 下标 / in / keys / 映射
// xl:round 789
// xl:judge stdout
// xl:end
// **按判定点并组（第 789 轮）**：吸收 exec/round706 里逐条一问的 34 条探针
// （p706a-a01 · p706a-a03 · p706a-a04 · p706a-a05 · p706c-x01 · p706c-x02 · p706c-x03 · p706c-x05 · p706c-x06 · p706c-x07 · p706c-x08 · p706c-x09 · p706c-x10 · p706d-y01 · p706d-y02 · p706d-y03 · p706d-y05 · p706d-y06 · p706d-y07 · p706d-y08 · p706e-z01 · p706e-z02 · p706e-z03 · p706e-z04 · p706e-z05 · p706e-z06 · p706e-z07 · p706e-z08 · p706f-w01 · p706f-w02 · p706f-w03 · p706f-w04 · p706f-w05 · p706f-w06）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// 数组的洞与长度：赋值 / defineProperty / 访问器那一格、几种名表、length 的描述符

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 p706a-a01.ts（第 706 轮）
(() => {
  const a = [1, , 3];
  console.log(show(JSON.stringify(a)) + " / " + show(a.join("-")) + " / " + show(a.length));
})();

// 吸收 p706a-a03.ts（第 706 轮）
(() => {
  const a = [1, , 3];
  console.log(show(Object.keys(a).join("|")) + " / " + show(a.map((v) => String(v)).join("|")));
})();

// 吸收 p706a-a04.ts（第 706 轮）
(() => {
  const a = [1, , 3]; const b = [1, undefined, 3];
  console.log(show(1 in a) + "," + show(1 in b) + "," + show(a.hasOwnProperty(1)));
})();

// 吸收 p706a-a05.ts（第 706 轮）
(() => {
  console.log(show(0 in [, 1]) + "," + show(1 in [, 1]) + "," + show(2 in [, 1]));
})();

// 吸收 p706c-x01.ts（第 706 轮）
(() => {
  const a = []; a[0] = 5;
  console.log(show(a.length) + "," + show(JSON.stringify(a)));
})();

// 吸收 p706c-x02.ts（第 706 轮）
(() => {
  const a = []; const i = 0; a[i] = 5;
  console.log(show(a.length) + "," + show(JSON.stringify(a)));
})();

// 吸收 p706c-x03.ts（第 706 轮）
(() => {
  const a = []; a[2] = 5;
  console.log(show(a.length) + "," + show(JSON.stringify(a)) + "," + show(1 in a));
})();

// 吸收 p706c-x05.ts（第 706 轮）
(() => {
  const a = [];
  console.log(show(Object.getOwnPropertyDescriptor(a, 0) === undefined));
})();

// 吸收 p706c-x06.ts（第 706 轮）
(() => {
  const a = [7];
  console.log(show(Object.getOwnPropertyDescriptor(a, "0") !== undefined));
})();

// 吸收 p706c-x07.ts（第 706 轮）
(() => {
  const a = [7];
  console.log(show(Object.hasOwn(a, 0)) + "," + show(a.hasOwnProperty(0)));
})();

// 吸收 p706c-x08.ts（第 706 轮）
(() => {
  const a = []; Object.defineProperty(a, 0, { value: 5, configurable: true });
  console.log(show(Object.keys(a).join("|")) + "," + show(a[0]) + "," + show(a.length));
})();

// 吸收 p706c-x09.ts（第 706 轮）
(() => {
  const a = []; Object.defineProperty(a, 0, { value: 5, configurable: true });
  console.log(show(Object.getOwnPropertyNames(a).join("|")));
})();

// 吸收 p706c-x10.ts（第 706 轮）
(() => {
  const o = {}; Object.defineProperty(o, 0, { value: 5, configurable: true, enumerable: true });
  console.log(show(o[0]) + "," + show(Object.keys(o).join("|")) + "," + show(o.length));
})();

// 吸收 p706d-y01.ts（第 706 轮）
(() => {
  const a = [];
  console.log(show(Object.keys(a).join("|")) + " / " + show(Object.getOwnPropertyNames(a).join("|")));
})();

// 吸收 p706d-y02.ts（第 706 轮）
(() => {
  const a = [1, 2];
  console.log(show(Object.keys(a).join("|")) + " / " + show(Object.getOwnPropertyNames(a).join("|")));
})();

// 吸收 p706d-y03.ts（第 706 轮）
(() => {
  const a = []; Object.defineProperty(a, 0, { value: 5, configurable: true });
  console.log(show(Object.keys(a).join("|")) + " / " + show(Object.getOwnPropertyNames(a).join("|")));
  const d = Object.getOwnPropertyDescriptor(a, "length");
  console.log(show(d.enumerable) + "," + show(d.writable) + "," + show(d.value));
})();

// 吸收 p706d-y05.ts（第 706 轮）
(() => {
  const a = [1];
  const d = Object.getOwnPropertyDescriptor(a, "length");
  console.log(show(d.enumerable) + "," + show(d.writable) + "," + show(d.value));
})();

// 吸收 p706d-y06.ts（第 706 轮）
(() => {
  const a = []; Object.defineProperty(a, 0, { value: 5 });
  console.log(show(Object.keys(a).join("|")) + " / " + show(JSON.stringify(a)));
})();

// 吸收 p706d-y07.ts（第 706 轮）
(() => {
  const a = []; Object.defineProperty(a, 0, { value: 5, configurable: true });
  console.log(show(0 in a) + "," + show(a[0]) + "," + show(a.length));
})();

// 吸收 p706d-y08.ts（第 706 轮）
(() => {
  const a = []; Object.defineProperty(a, 0, { value: 5, configurable: true });
  const out = []; for (const k in a) out.push(k);
  console.log(show(out.join("|")));
})();

// 吸收 p706e-z01.ts（第 706 轮）
(() => {
  const a = []; a[0] = 5;
  console.log(show(Object.keys(a).join("|")));
})();

// 吸收 p706e-z02.ts（第 706 轮）
(() => {
  const a = [5];
  console.log(show(Object.keys(a).join("|")));
})();

// 吸收 p706e-z03.ts（第 706 轮）
(() => {
  const a = [];
  Object.defineProperty(a, 0, { value: 5 });
  console.log(show(Object.keys(a).join("|")));
})();

// 吸收 p706e-z04.ts（第 706 轮）
(() => {
  const a = [];
  Object.defineProperty(a, 0, { value: 5 });
  a[1] = 6;
  console.log(show(Object.keys(a).join("|")) + " / " + show(a.length));
})();

// 吸收 p706e-z05.ts（第 706 轮）
(() => {
  const a = [];
  Object.defineProperty(a, "z", { value: 5, enumerable: true });
  console.log(show(Object.keys(a).join("|")));
})();

// 吸收 p706e-z06.ts（第 706 轮）
(() => {
  const a = [];
  Object.defineProperty(a, 0, { value: 5 });
  console.log(show(JSON.stringify(a)) + " / " + show(Object.keys(a).length));
})();

// 吸收 p706e-z07.ts（第 706 轮）
(() => {
  const a = [];
  Object.defineProperty(a, 0, { value: 5 });
  console.log(show(Object.getOwnPropertyNames(a).join("|")));
})();

// 吸收 p706e-z08.ts（第 706 轮）
(() => {
  const a = [];
  Object.defineProperty(a, 0, { value: 5 });
  Object.defineProperty(a, 1, { value: 6 });
  console.log(show(Object.keys(a).join("|")) + " / " + show(JSON.stringify(a)));
})();

// 吸收 p706f-w01.ts（第 706 轮）
(() => {
  const a = [];
  Object.defineProperty(a, 0, { value: 5 });
  console.log(show(Array.isArray(a)) + "," + show(a.length) + "," + show(a[0]) + "," + show(a["0"]));
})();

// 吸收 p706f-w02.ts（第 706 轮）
(() => {
  const a = [];
  Object.defineProperty(a, 0, { value: 5 });
  console.log(show(Object.hasOwn(a, "0")) + "," + show(Object.hasOwn(a, 0)) + "," + show(a.hasOwnProperty(0)));
})();

// 吸收 p706f-w03.ts（第 706 轮）
(() => {
  const a = [];
  Object.defineProperty(a, 0, { value: 5 });
  const d = Object.getOwnPropertyDescriptor(a, 0);
  console.log(show(d === undefined) + "," + show(d && d.value) + "," + show(d && d.enumerable));
})();

// 吸收 p706f-w04.ts（第 706 轮）
(() => {
  const a = [];
  Object.defineProperty(a, "0", { value: 5, enumerable: false });
  console.log(show(Object.keys(a).join("|")) + " / " + show(JSON.stringify(a)));
})();

// 吸收 p706f-w05.ts（第 706 轮）
(() => {
  const a = [];
  Object.defineProperty(a, 3, { value: 5 });
  console.log(show(a.length) + "," + show(Object.keys(a).join("|")) + "," + show(JSON.stringify(a)));
})();

// 吸收 p706f-w06.ts（第 706 轮）
(() => {
  const a = [1];
  Object.defineProperty(a, 1, { value: 5 });
  console.log(show(a.length) + "," + show(Object.keys(a).join("|")) + "," + show(JSON.stringify(a)));
})();
