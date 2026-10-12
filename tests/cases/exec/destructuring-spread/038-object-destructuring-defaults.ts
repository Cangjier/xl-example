// xl:title 解构默认值：只认 `undefined`、后面的默认值看得到前面的
// xl:round 792
// xl:judge stdout
// xl:end
// **按判定点并组（第 792 轮）**：把 exec/destructuring-spread 里同一个判定点的 10 条并成这一条
// （保留 020-destructure-default-undefined；吸收 029-object-destructure-default · p-destructure-default · probe2-e03 · probe693b-d25 · probe693b-d27 · probe693b-d28 · probe693b-d32 · probe698-d02 · probe698-d13）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// `null` **不**触发默认值；默认值按左到右求值，后面的能读前面的；剩余里的键不算被解构走

// 保留条本身：020-destructure-default-undefined.ts
(() => {
  const { a = 1, b = 2 } = { a: null, b: undefined } as any;
  console.log(a, b);
  const [x = 3, y = 4] = [undefined, null] as any;
  console.log(x, y);
})();

// 吸收 029-object-destructure-default.ts
(() => {
  // **合并了原先逐字节相同的 2 条**（同一件事被逐批重抄的结果）：
  //   · exec/destructuring-spread/probe698-d01.ts
  //   · runtime/iterators/probe705-i-c16.ts
  // 判定点只有一个：正文那一句表达式（期望值由真 `node` 现给，打印口径钉成 `typeof:值`）。
  // 被吸收的那几条的正文与本条**逐字节相同**，所以合并不改变任何判据。
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const { a = 5 } = {}; return a; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 p-destructure-default.ts
(() => {

  const { a = 1, b = 2 } = { a: null, b: undefined };
  console.log(a, b);
})();

// 吸收 probe2-e03.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const { a = 1, b: { c = 2 } = {} } = {}; return a + "," + c; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-d25.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const { a = 1, b = a + 1 } = {}; return a + b; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-d27.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const o = {}; const { a = 1 } = o; return a; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-d28.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const { a = 1 } = { a: undefined }; return a; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-d32.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function f({ a = 1, ...r }) { return a + Object.keys(r).length; } return f({ b: 2 }); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe698-d02.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const { a = 5 } = { a: null }; return a; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe698-d13.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const { a = 1, b = a + 1 } = {}; return b; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
