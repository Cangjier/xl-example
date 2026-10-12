// xl:title 展开实参：调用、`new`、部分展开与 `apply`
// xl:round 792
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
// **按判定点并组（第 792 轮）**：把 exec/destructuring-spread 里同一个判定点的 9 条并成这一条
// （保留 001-spread-in-new；吸收 004-spread-in-new-and-call · 008-spread-forms · 011-spread-new-and-rest-class · 014-spread-call-and-literal · 023-spread-call-apply · 033-call-spread-math-max · probe2-e11 · probe2-e12）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// `f(...xs)` / `new C(...xs)` / `Math.max(...xs)` 与 `apply`；**部分展开**时后面的形参是 undefined

// 保留条本身：001-spread-in-new.ts
(() => {

  class P { x = 0; y = 0; constructor(x: number, y: number) { this.x = x; this.y = y; } }
  const args: [number, number] = [1, 2];
  console.log(new P(...args).x, new P(...[3, 4]).y);
  console.log(new Map([[1, 2]] as any).get(1));
})();

// 吸收 004-spread-in-new-and-call.ts
(() => {

  class P { x: number; y: number; constructor(x: number, y: number) { this.x = x; this.y = y; } sum() { return this.x + this.y; } }
  const args: [number, number] = [3, 4];
  console.log(new P(...args).sum());
  console.log(Math.max(...args), [0, ...args, 9].join(","));
  const obj = { ...{ k: 1 }, ...{ k: 2 } };
  console.log(JSON.stringify(obj));
})();

// 吸收 008-spread-forms.ts
(() => {
  const xs = [1, 2, 3];
  function sum(...ns: number[]): number { return ns.reduce((a, b) => a + b, 0); }
  class P { constructor(public vals: number[]) {} }
  const obj = { a: 1, ...{ b: 2 }, ...(true ? { c: 3 } : {}) };
  console.log(sum(...xs), sum(...xs, 4), Math.max(...xs));
  console.log(new P([...xs]).vals.length, JSON.stringify([0, ...xs, 4]));
  console.log(JSON.stringify({ ...obj, a: 9 }), JSON.stringify({ ...xs }));
})();

// 吸收 011-spread-new-and-rest-class.ts
(() => {

  class P { constructor(...parts) { this.parts = parts; } sum() { return this.parts.reduce((a, b) => a + b, 0); } }
  const args = [1, 2, 3];
  console.log(new P(...args).sum(), new P(4, ...[5, 6]).sum());
})();

// 吸收 014-spread-call-and-literal.ts
(() => {

  function sum(...ns: number[]): number {
    return ns.reduce((a, b) => a + b, 0);
  }
  const xs = [1, 2];
  console.log(sum(...xs, 3), sum(...[4, 5]));
  console.log([0, ...xs, 3].join(","));
  const o = { a: 1 };
  console.log(JSON.stringify({ ...o, b: 2 }));
})();

// 吸收 023-spread-call-apply.ts
(() => {
  const xs: any = [3, 1, 2];
  console.log(Math.max(...xs), Math.min(...xs), Math.max.apply(null, xs));
  function f(a: any, ...rest: any[]): string { return a + ":" + rest.length; }
  console.log(f(...xs));
  console.log(JSON.stringify([0, ...xs, 9]));
})();

// 吸收 033-call-spread-math-max.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { return Math.max(...[1, 5, 3]); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe2-e11.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const f = (a, b, c) => a + b + c; const xs = [1, 2, 3]; return f(...xs); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe2-e12.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const f = (a, b, c) => a + b + (c === undefined ? "u" : c); return f(1, ...[2]); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
