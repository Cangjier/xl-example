// xl:title 可选链与空值合并：短路不调 getter、`?.()` / `?.[]`、`??` 只看 `null` / `undefined`
// xl:round 762
// xl:judge stdout
// xl:note 第 762 轮普查里**全过**的一片，收进矩阵当守卫（含**短路时 getter 一次都不跑**
// xl:note （`n` 停在 0）、`o?.a()` 与 `o.a?.()` 两格不同、`0` / `""` / `NaN` 拿 `??` **不换值**、
// xl:note 两级 `?.` 之后接 `??`、以及 `(o.a?.b)?.c` 那种括号化的链）。
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('01 (function () { const o: any = { a:', show(() => (function () { const o: any = { a: { b: 1 } }; return o.a?.b; })()));
console.log('02 (function () { const o: any = {}; ', show(() => (function () { const o: any = {}; return o.a?.b; })()));
console.log('03 (function () { const o: any = null', show(() => (function () { const o: any = null; return o?.a; })()));
console.log('04 (function () { const o: any = null', show(() => (function () { const o: any = null; return o?.a(); })()));
console.log('05 (function () { const o: any = {}; ', show(() => (function () { const o: any = {}; return o.a?.(); })()));
console.log('06 (function () { const o: any = { a:', show(() => (function () { const o: any = { a: () => 1 }; return o.a?.(); })()));
console.log('07 (function () { const o: any = { a:', show(() => (function () { const o: any = { a: { b: 1 } }; return o.a?.b?.c; })()));
console.log('08 (function () { const o: any = {}; ', show(() => (function () { const o: any = {}; return o.a?.[0]; })()));
console.log('09 (function () { const o: any = { a:', show(() => (function () { const o: any = { a: [1] }; return o.a?.[0]; })()));
console.log('10 (function () { return null ?? 1; }', show(() => (function () { return null ?? 1; })()));
console.log('11 (function () { return undefined ??', show(() => (function () { return undefined ?? 2; })()));
console.log('12 (function () { return 0 ?? 3; })()', show(() => (function () { return 0 ?? 3; })()));
console.log('13 (function () { return "" ?? 4; })(', show(() => (function () { return "" ?? 4; })()));
console.log('14 (function () { return NaN ?? 5; })', show(() => (function () { return NaN ?? 5; })()));
console.log('15 (function () { const o: any = { a:', show(() => (function () { const o: any = { a: { b: 2 } }; return o.a?.b ?? 9; })()));
console.log('16 (function () { const o: any = {}; ', show(() => (function () { const o: any = {}; return o.a?.b ?? 9; })()));
console.log('17 (function () { const o: any = {}; ', show(() => (function () { const o: any = {}; return (o.a?.b)?.c; })()));
console.log('18 (function () { const o: any = { a:', show(() => (function () { const o: any = { a: 1 }; return o.a?.b; })()));
console.log('19 (function () { let n = 0; const o:', show(() => (function () { let n = 0; const o: any = { get a() { n = n + 1; return null; } }; o.a?.b; return n; })()));
console.log('20 (function () { const f: any = unde', show(() => (function () { const f: any = undefined; return f?.(); })()));
