// xl:title `async function*` 的 `next()` 给的是承诺
// xl:round 754
// xl:judge stdout
// xl:note 第 754 轮普查里的一条（期望值由 `node` 现给，打印口径 `typeof:值`）
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('(function () { async function*', show(() => (function () { async function* g() { yield 1; } return g().next().constructor.name; })()));
console.log('(function () { async function*', show(() => (function () { async function* g() { yield 1; } return typeof g().next().then; })()));
console.log('(function () { async function*', show(() => (function () { async function* g() { yield 1; return 2; } const it: any = g(); return it.next().then((r: any) => r.value + ":" + r.done); })()));
console.log('(function () { async function*', show(() => (function () { async function* g() { yield 1; } return Object.prototype.toString.call(g().next()); })()));
console.log('(function () { async function*', show(() => (function () { async function* g() { yield 1; } const it: any = g(); return it.next() instanceof Promise; })()));
console.log('(function () { async function*', show(() => (function () { async function* g() { yield 1; } return typeof g()[Symbol.asyncIterator]; })()));
console.log('(function () { async function*', show(() => (function () { async function* g() { yield 1; } return typeof g()[Symbol.iterator]; })()));
console.log('(function () { function* g() {', show(() => (function () { function* g() { yield 1; } return g().next().constructor.name; })()));
console.log('(function () { function* g() {', show(() => (function () { function* g() { yield 1; } return typeof g().next().then; })()));
