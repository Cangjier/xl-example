// xl:title 键的次序与 delete：整数键 / 字符串键 / 符号键
// xl:round 789
// xl:judge stdout
// xl:end
// **按判定点并组（第 789 轮）**：吸收 exec/round706 里逐条一问的 17 条探针
// （p706a-k01 · p706a-k02 · p706a-k03 · p706a-k04 · p706a-k05 · p706a-k06 · p706b-e01 · p706b-e02 · p706b-e03 · p706b-e04 · p706b-e06 · p706b-e07 · p706c-x14 · p706c-x15 · p706c-x16 · p706c-x17 · p706c-x18）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// 整数键在前、按升序；for..in 只看可枚举；delete 的落点与删掉之后重加的位置；符号键不进 JSON

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 p706a-k01.ts（第 706 轮）
(() => {
  const o = { b: 2, 10: "ten", 2: "two", a: 1 };
  console.log(show(Object.keys(o).join("|")) + " / " + show(JSON.stringify(o)));
})();

// 吸收 p706a-k02.ts（第 706 轮）
(() => {
  const o = { a: 1 }; Object.defineProperty(o, "b", { value: 2, enumerable: false }); o[Symbol("s")] = 3;
  const out = []; for (const k in o) out.push(k);
  console.log(show(out.join("|")));
})();

// 吸收 p706a-k03.ts（第 706 轮）
(() => {
  const o = { z: 1, 2: 2, y: 3, 0: 4 };
  console.log(show(Object.getOwnPropertyNames(o).join("|")));
})();

// 吸收 p706a-k04.ts（第 706 轮）
(() => {
  const s = Symbol("s"); const o = { a: 1, [s]: 2 };
  console.log(show(Object.keys(o).length) + "," + show(JSON.stringify(o)) + "," + show(Object.getOwnPropertySymbols(o).length));
})();

// 吸收 p706a-k05.ts（第 706 轮）
(() => {
  const o = { 1: "a", 2: "b" }; delete o[1]; o[1] = "c";
  console.log(show(Object.keys(o).join("|")));
})();

// 吸收 p706a-k06.ts（第 706 轮）
(() => {
  const o = { 2: "b", 1: "a", x: "c" };
  console.log(show(Object.values(o).join("|")) + " / " + show(JSON.stringify(Object.entries(o))));
})();

// 吸收 p706b-e01.ts（第 706 轮）
(() => {
  const o = { 1: "a", 2: "b" }; run(() => { delete o[1]; console.log(show(Object.keys(o).join("|"))); });
})();

// 吸收 p706b-e02.ts（第 706 轮）
(() => {
  const o = { 1: "a" }; delete o[1]; run(() => { o[1] = "c"; console.log(show(Object.keys(o).join("|"))); });
})();

// 吸收 p706b-e03.ts（第 706 轮）
(() => {
  const o = { 1: "a" }; delete o["1"];
  console.log(show(Object.keys(o).length));
})();

// 吸收 p706b-e04.ts（第 706 轮）
(() => {
  const o = { a: 1, b: 2 }; delete o.a;
  console.log(show(Object.keys(o).join("|")));
})();

// 吸收 p706b-e06.ts（第 706 轮）
(() => {
  const o = { 1: "a" }; delete o[1]; o[1] = "b";
  console.log(show(o[1]) + "," + show(Object.keys(o).length));
})();

// 吸收 p706b-e07.ts（第 706 轮）
(() => {
  const o = { 1: "a", 2: "b", z: "z" }; delete o[1]; o[1] = "c";
  console.log(show(Object.keys(o).join("|")));
})();

// 吸收 p706c-x14.ts（第 706 轮）
(() => {
  const o = { 1: "a", 2: "b" }; delete o[1];
  console.log(show(Object.keys(o).join("|")));
})();

// 吸收 p706c-x15.ts（第 706 轮）
(() => {
  const o = { 1: "a" }; delete o[1]; o[1] = "c";
  console.log(show(Object.keys(o).join("|")) + "," + show(o[1]));
})();

// 吸收 p706c-x16.ts（第 706 轮）
(() => {
  const p = { a: 1 }; const o = Object.create(p); delete o.a;
  console.log(show(o.a) + "," + show("a" in o));
})();

// 吸收 p706c-x17.ts（第 706 轮）
(() => {
  const o = { a: 1 }; const k = "a"; delete o[k];
  console.log(show(Object.keys(o).length));
})();

// 吸收 p706c-x18.ts（第 706 轮）
(() => {
  const s = Symbol("s"); const o = { [s]: 1 }; delete o[s];
  console.log(show(Object.getOwnPropertySymbols(o).length));
})();
