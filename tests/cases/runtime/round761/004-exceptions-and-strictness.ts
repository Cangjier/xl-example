// xl:title 异常流转与严格性：抛出的形状、六种 `TypeError` / `RangeError` 的落点、松散与严格
// xl:round 761
// xl:judge stdout
// xl:note 第 761 轮普查里**全过**的一片，收进矩阵当守卫（含抛出非 `Error` 的值、
// xl:note `null` / `undefined` / 非函数三种调用的 `TypeError`、`JSON.parse` 的 `SyntaxError`、
// xl:note `new Array(-1)` 与 `toFixed(200)` 的 `RangeError`、`decodeURIComponent("%")` 的 `URIError`、
// xl:note `Symbol() + ""` 的 `TypeError`，以及松散 / 严格 / 箭头三种 `this`）。
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('01 (function () { try { throw 1; } ca', show(() => (function () { try { throw 1; } catch (e) { return typeof e; } })()));
console.log('02 (function () { try { throw new Typ', show(() => (function () { try { throw new TypeError("t"); } catch (e) { return (e as Error).name + ":" + (e as Error).message; } })()));
console.log('03 (function () { try { (null as any)', show(() => (function () { try { (null as any).x; } catch (e) { return (e as Error).constructor.name; } })()));
console.log('04 (function () { try { (undefined as', show(() => (function () { try { (undefined as any).x; } catch (e) { return (e as Error).constructor.name; } })()));
console.log('05 (function () { try { (1 as any)();', show(() => (function () { try { (1 as any)(); } catch (e) { return (e as Error).constructor.name; } })()));
console.log('06 (function () { try { ("x" as any a', show(() => (function () { try { ("x" as any as { a: number }).a(); } catch (e) { return (e as Error).constructor.name; } })()));
console.log('07 (function () { try { JSON.parse("{', show(() => (function () { try { JSON.parse("{"); } catch (e) { return (e as Error).name; } })()));
console.log('08 (function () { try { new Array(-1)', show(() => (function () { try { new Array(-1); } catch (e) { return (e as Error).constructor.name; } })()));
console.log('09 (function () { try { (1).toFixed(2', show(() => (function () { try { (1).toFixed(200); } catch (e) { return (e as Error).constructor.name; } })()));
console.log('10 (function () { try { decodeURIComp', show(() => (function () { try { decodeURIComponent("%"); } catch (e) { return (e as Error).constructor.name; } })()));
console.log('11 (function () { try { const o: any ', show(() => (function () { try { const o: any = {}; o.x.y; } catch (e) { return (e as Error).constructor.name; } })()));
console.log('12 (function () { try { (Symbol() as ', show(() => (function () { try { (Symbol() as any) + ""; } catch (e) { return (e as Error).constructor.name; } })()));
console.log('13 (function () { function f() { retu', show(() => (function () { function f() { return this === undefined; } return f(); })()));
console.log('14 (function () { function f() { "use', show(() => (function () { function f() { "use strict"; return this === undefined; } return f(); })()));
console.log('15 (function () { const f = () => thi', show(() => (function () { const f = () => this; return typeof f(); })()));
console.log('16 (function () { try { "a".repeat(-1', show(() => (function () { try { "a".repeat(-1); } catch (e) { return (e as Error).constructor.name; } })()));
console.log('17 (function () { try { Object.define', show(() => (function () { try { Object.defineProperty({}, "a", { get: 1 }); } catch (e) { return (e as Error).constructor.name; } })()));
