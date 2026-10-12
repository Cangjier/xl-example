// xl:title 对象展开：次序即覆盖、只取可枚举自有格、符号键与访问器
// xl:round 792
// xl:judge stdout
// xl:end
// **按判定点并组（第 792 轮）**：把 exec/destructuring-spread 里同一个判定点的 7 条并成这一条
// （保留 003-object-spread-and-destructure-mixed；吸收 017-sym-spread-keeps-symbol-keys · 018-getter-spread · probe2-e10 · probe693b-d15 · probe693b-d16 · probe693b-d19）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// 后写的键盖前面的同名键；`Object.assign` 与展开对访问器各求值一次

// 保留条本身：003-object-spread-and-destructure-mixed.ts
(() => {

  const src = { a: 1, b: 2, c: 3, d: 4 };
  const { a, b: renamed, e = 9, ...rest } = src;
  console.log(a, renamed, e, JSON.stringify(rest));
  const merged = { ...src, b: 20, extra: true };
  console.log(JSON.stringify(merged));
  const nested: any = { p: { q: { r: 5 } } };
  const { p: { q: { r } } } = nested;
  console.log(r);
})();

// 吸收 017-sym-spread-keeps-symbol-keys.ts
(() => {

  const s = Symbol("k");
  const src: any = { a: 1, [s]: 2 };
  const spread: any = { ...src };
  const assigned: any = Object.assign({}, src);
  console.log(spread.a, spread[s]);
  console.log(assigned.a, assigned[s]);
})();

// 吸收 018-getter-spread.ts
(() => {
  let reads = 0;
  const src: any = { get a() { reads++; return 1; }, set a(v: any) { reads += 100; } };
  const copy: any = { ...src, b: 2 };
  try { console.log("reads", String(reads)); } catch (e) { console.log("reads", "ERR", String(e && e.name)); }
  try { console.log("copy-own-a", String(Object.getOwnPropertyDescriptor(copy, 'a').get === undefined)); } catch (e) { console.log("copy-own-a", "ERR", String(e && e.name)); }
  try { console.log("copy-value", String(copy.a)); } catch (e) { console.log("copy-value", "ERR", String(e && e.name)); }
  try { console.log("assign", String((() => { let n = 0; const s: any = { get x() { n++; return 5; } }; const t: any = {}; Object.assign(t, s); return n + ':' + t.x + ':' + String(Object.getOwnPropertyDescriptor(t, 'x').get === undefined); })())); } catch (e) { console.log("assign", "ERR", String(e && e.name)); }
})();

// 吸收 probe2-e10.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const o = { a: 1 }; const p = { ...o, b: 2 }; return JSON.stringify(p); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-d15.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const o = { a: 1 }; return { ...o, b: 2 }.b; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-d16.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const o = { a: 1 }; const p = { a: 2, ...o }; return p.a; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-d19.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const o = { ...{ a: 1 }, ...{ a: 2 } }; return o.a; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
