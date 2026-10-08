// xl:title 承诺那一侧的形状：原型、标签、`then` / `catch` / `finally`、`async` 函数的返回值
// xl:round 761
// xl:judge stdout
// xl:note 第 761 轮普查里**全过**的一片，收进矩阵当守卫（含 `instanceof Promise`、
// xl:note `Object.prototype.toString` 的标签、`Promise.resolve()` 自己那一格、
// xl:note `then` / `catch` 的形参个数、`async` 函数返回值与 `Promise.length`）。
// xl:note **`Promise.reject(...)` 单独一行会让 node 自己非零退出**（悬着的拒绝），
// xl:note 那是用例自己不合法，所以这一条不写它。
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('01 (function () { return typeof Promi', show(() => (function () { return typeof Promise.resolve(1).then; })()));
console.log('02 (function () { return Promise.reso', show(() => (function () { return Promise.resolve(1) instanceof Promise; })()));
console.log('03 (function () { return Object.proto', show(() => (function () { return Object.prototype.toString.call(Promise.resolve(1)); })()));
console.log('04 (function () { return typeof Promi', show(() => (function () { return typeof Promise.prototype.finally; })()));
console.log('05 (function () { return typeof Promi', show(() => (function () { return typeof Promise.allSettled; })()));
console.log('06 (function () { return typeof Promi', show(() => (function () { return typeof Promise.any; })()));
console.log('07 (function () { return Promise.all(', show(() => (function () { return Promise.all([]).constructor.name; })()));
console.log('08 (function () { return typeof (asyn', show(() => (function () { return typeof (async () => 1)().then; })()));
console.log('09 (function () { async function f() ', show(() => (function () { async function f() { return 1; } return Object.prototype.toString.call(f()); })()));
console.log('10 (function () { const p = Promise.r', show(() => (function () { const p = Promise.resolve(1); return p === p.then(() => {}); })()));
console.log('11 (function () { return typeof Promi', show(() => (function () { return typeof Promise.resolve(1).catch; })()));
console.log('12 (function () { return Promise.reso', show(() => (function () { return Promise.resolve().then.length; })()));
console.log('13 (function () { return Promise.leng', show(() => (function () { return Promise.length; })()));
console.log('14 (function () { return typeof ((asy', show(() => (function () { return typeof ((async function () {}) as any)[Symbol.toStringTag]; })()));
