// xl:title yield* 委托：转发、内层返回值、双向传值与清理次序
// xl:round 790
// xl:judge stdout
// xl:end
// **按判定点并组（第 790 轮）**：吸收 runtime/iterators 里同判定点的 11 条用例
// （003-gen-delegating · 016-generator-delegation-and-return · 023-generator-delegate-bidirectional · 027-gen-delegate-return · 032-yield-star-custom · 037-generator-yield-star-return · probe693b-g05 · probe693b-g25 · probe694-g06 · probe694-g07 · probe695-g06）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// 内层的产出被逐步转发、内层的 return 值成为 yield* 表达式的值、finally 的次序

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 003-gen-delegating.ts
(() => {
  function* inner(): any { yield 2; yield 3; }
  function* outer(): any { yield 1; yield* inner(); yield* [4, 5]; yield 6; }
  console.log([...outer()].join(","));
})();

// 吸收 016-generator-delegation-and-return.ts（第 323 轮）
(() => {
  function* inner() { yield 1; yield 2; return "inner-done"; }
  function* outer() { const r = yield* inner(); yield r; }
  const it = outer();
  console.log(JSON.stringify(it.next()));
  console.log(JSON.stringify(it.next()));
  console.log(JSON.stringify(it.next()));
  console.log(JSON.stringify(it.next()));
})();

// 吸收 023-generator-delegate-bidirectional.ts（第 7 轮）
(() => {
  function* inner() {
    const got = yield "a";
    yield "inner-saw:" + got;
    return "inner-ret";
  }
  function* outer() {
    const back = yield* inner();
    yield "outer-saw:" + back;
  }
  const it = outer();
  console.log(JSON.stringify(it.next()));
  console.log(JSON.stringify(it.next("first")));
  console.log(JSON.stringify(it.next("second")));
  console.log(JSON.stringify(it.next()));
})();

// 吸收 027-gen-delegate-return.ts（第 8 轮）
(() => {
  function* inner() {
    try { yield 1; return "r"; } finally { console.log("inner-finally"); }
  }
  function* outer() {
    const got = yield* inner();
    console.log("got", got);
    yield 2;
  }
  for (const v of outer()) console.log("v", v);
})();

// 吸收 032-yield-star-custom.ts（第 683 轮）
(() => {
  function* inner() { yield 1; yield 2; return 'done'; }
  function* outer() { const r = yield* inner(); yield 'after-' + r; }
  try { console.log("delegate", String([...outer()].join(','))); } catch (e) { console.log("delegate", "ERR", String(e && e.name)); }
  const custom: any = { [Symbol.iterator]() { let i = 0; return { next: () => (i < 2 ? { value: 'c' + i++, done: false } : { value: undefined, done: true }) }; } };
  function* mixed() { yield* custom; yield 'end'; }
  try { console.log("yield-star-iterable", String([...mixed()].join(','))); } catch (e) { console.log("yield-star-iterable", "ERR", String(e && e.name)); }
})();

// 吸收 037-generator-yield-star-return.ts（第 691 轮）
(() => {
  function* inner(): any { yield 1; yield 2; return "inner-return"; }
  function* outer(): any {
    const got = yield* inner();
    console.log("got", got);
    yield 3;
  }
  console.log([...outer()].join(","));
})();

// 吸收 probe693b-g05.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function* g() { yield* [1, 2]; } return [...g()].join(","); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-g25.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function* outer() { yield* inner(); } function* inner() { yield 3; } return [...outer()].join(","); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe694-g06.ts（第 694 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function* g() { yield* [1, 2]; yield* "ab"; } return [...g()].join(","); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe694-g07.ts（第 694 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function* g() { yield* (function* () { yield 1; })(); } return [...g()].join(","); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe695-g06.ts（第 695 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function* g() { yield* "ab"; } return [...g()].join(","); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
