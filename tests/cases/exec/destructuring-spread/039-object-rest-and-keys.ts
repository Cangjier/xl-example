// xl:title 对象剩余：剩下的键有哪几个
// xl:round 792
// xl:judge stdout
// xl:end
// **按判定点并组（第 792 轮）**：把 exec/destructuring-spread 里同一个判定点的 4 条并成这一条
// （保留 probe2-e02；吸收 probe2-e13 · probe693b-d06 · probe698-d05）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// `{a, ...r}` 的 `r` 只装**没被前面取走的自有可枚举**键（JSON 与 `Object.keys` 两个出口各一次）

// 保留条本身：probe2-e02.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const { a, ...r } = { a: 1, b: 2, c: 3 }; return a + "|" + JSON.stringify(r); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe2-e13.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const o = { a: 1, b: 2 }; const { a, ...rest } = o; return Object.keys(rest).join(","); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-d06.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const { a, ...r } = { a: 1, b: 2, c: 3 }; return Object.keys(r).join(","); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe698-d05.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const { a, ...rest } = { a: 1, b: 2 }; return JSON.stringify(rest); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
