// xl:title 类：继承、`super` 的三种用法与两条原型链
// xl:round 753
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round753 里同判定点的
// 1 条原子探针并成这一条：p753a-03
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round753/p753a-03.ts · 类：继承、`super` 的三种用法与 `new.target` =====
await (async () => {
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('(function () { class A { m() {', show(() => (function () { class A { m() { return 1; } } class B extends A {} return new B().m(); })()));
console.log('(function () { class A { m() {', show(() => (function () { class A { m() { return 1; } } class B extends A { m() { return super.m() + 1; } } return new B().m(); })()));
console.log('(function () { class A { const', show(() => (function () { class A { constructor(x: any) { this.a = x; } } class B extends A { constructor() { super(1); } } return new B().a; })()));
console.log('(function () { class A {} clas', show(() => (function () { class A {} class B extends A { constructor() { super(); this.b = 2; } } return new B().b; })()));
console.log('(function () { class A { stati', show(() => (function () { class A { static m() { return 1; } } class B extends A { static m() { return super.m() + 1; } } return B.m(); })()));
console.log('(function () { class A {} retu', show(() => (function () { class A {} return new A() instanceof A; })()));
console.log('(function () { class A {} clas', show(() => (function () { class A {} class B extends A {} return Object.getPrototypeOf(B.prototype) === A.prototype; })()));
console.log('(function () { class A {} clas', show(() => (function () { class A {} class B extends A {} return Object.getPrototypeOf(B) === A; })()));
})();
}
main();
