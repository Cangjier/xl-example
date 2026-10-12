// xl:title 引擎自己抛的错：家族 / 名字 / 能接住
// xl:round 791
// xl:judge stdout
// xl:end
// **按判定点并组（第 791 轮）**：把 stdlib/error 里同一个判定点的 6 条并成这一条
// （保留 004-error-engine-throws；吸收 003-error-instanceof · probe-e08 · probe-e12 · probe697-e18 · probe697-e20）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// 取属性落到 null / undefined、调用非函数、在只有一项的数组上 reduce——引擎抛的都是 TypeError，且 try 接得住

// 保留条本身：004-error-engine-throws.ts
(() => {

  try { const o: any = undefined; o.x; } catch (e: any) { console.log("prop", e.name, e instanceof TypeError); }
  try { (1 as any)(); } catch (e: any) { console.log("call", e.name, e instanceof Error); }
})();

// 吸收 003-error-instanceof.ts
(() => {

  const e = new TypeError("x");
  console.log(e instanceof TypeError, e instanceof Error, e instanceof RangeError);
  try { null.x; } catch (err: any) { console.log(err instanceof TypeError, err.name); }
})();

// 吸收 probe-e08.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { try { null.x; } catch (e) { return e.name; } })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe-e12.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { try { (void 0)(); } catch (e) { return e.constructor === TypeError; } })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe697-e18.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { try { new (function A(){})().nope.deep; } catch (e) { return e.constructor.name; } })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe697-e20.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { try { [1].reduce((a, b) => a); } catch (e) { return e.constructor.name; } })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
