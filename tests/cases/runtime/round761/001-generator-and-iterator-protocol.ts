// xl:title 生成器与迭代协议：`yield*` / `return` / 传值 / 三条迭代入口
// xl:round 761
// xl:judge stdout
// xl:note 第 761 轮普查里**全过**的一片，收进矩阵当守卫：`yield*` 委托与 `return` 的返回值、
// xl:note `next(v)` 把值送进挂起点、`finally` 与 `return()` 的次序、`Symbol.iterator` 三处相等、
// xl:note 自定义可迭代对象、`Map` / `Set` / 数组的迭代器形状、解构与展开走同一格。
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('01 (function () { function* g() { yie', show(() => (function () { function* g() { yield 1; yield 2; } return [...g()].join(","); })()));
console.log('02 (function () { function* g() { yie', show(() => (function () { function* g() { yield 1; return 3; } const it = g(); return [it.next().value, it.next().value, it.next().done].join(":"); })()));
console.log('03 (function () { function* g() { try', show(() => (function () { function* g() { try { yield 1; } finally { } } const it = g(); it.next(); return it.return(9).value; })()));
console.log('04 (function () { function* g() { yie', show(() => (function () { function* g() { yield 1; } const it = g(); return typeof it[Symbol.iterator]; })()));
console.log('05 (function () { function* g() { yie', show(() => (function () { function* g() { yield* [1, 2]; } return [...g()].join(","); })()));
console.log('06 (function () { function* g() { con', show(() => (function () { function* g() { const x = yield 1; return x; } const it = g(); it.next(); return it.next(7).value; })()));
console.log('07 (function () { function* g() { yie', show(() => (function () { function* g() { yield 1; } const it = g(); it.next(); return JSON.stringify(it.next()); })()));
console.log('08 (function () { function* g() { thr', show(() => (function () { function* g() { throw new Error("x"); } return g().next().done; })()));
console.log('09 (function () { const o = { *[Symbo', show(() => (function () { const o = { *[Symbol.iterator]() { yield 1; yield 2; } }; return [...o].join(","); })()));
console.log('10 (function () { async function* g()', show(() => (function () { async function* g() { yield 1; } return typeof g().next().then; })()));
console.log('11 (function () { function* g() {} re', show(() => (function () { function* g() {} return g().next().done; })()));
console.log('12 (function () { function* g() { yie', show(() => (function () { function* g() { yield 1; } const it = g(); it.next(); return it.next().done; })()));
console.log('13 (function () { const m = new Map([', show(() => (function () { const m = new Map([[1, 2]]); return [...m[Symbol.iterator]()].length; })()));
console.log('14 (function () { const m = new Map([', show(() => (function () { const m = new Map([[1, 2]]); return m[Symbol.iterator] === m.entries; })()));
console.log('15 (function () { const s = new Set([', show(() => (function () { const s = new Set([1]); return s[Symbol.iterator] === s.values; })()));
console.log('16 (function () { return [][Symbol.it', show(() => (function () { return [][Symbol.iterator]().next().done; })()));
console.log('17 (function () { function* g() { yie', show(() => (function () { function* g() { yield 1; } const [a] = g(); return a; })()));
console.log('18 (function () { const it = [1, 2][S', show(() => (function () { const it = [1, 2][Symbol.iterator](); return [it.next().value, it.next().value, it.next().done].join(":"); })()));
