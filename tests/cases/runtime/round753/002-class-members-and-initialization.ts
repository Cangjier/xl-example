// xl:title 类：字段、方法、访问器、静态成员与初始化次序（含私有名与静态块）
// xl:round 753
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round753 里同判定点的
// 1 条原子探针并成这一条：p753a-02
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round753/p753a-02.ts · 类：字段、方法、访问器、静态成员与初始化次序 =====
await (async () => {
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('(function () { class A { x = 1', show(() => (function () { class A { x = 1; y; } return new A().x; })()));
console.log('(function () { class A { y; } ', show(() => (function () { class A { y; } return new A().y; })()));
console.log('(function () { class A { get g', show(() => (function () { class A { get g() { return 1; } } return new A().g; })()));
console.log('(function () { class A { stati', show(() => (function () { class A { static s = 2; } return A.s; })()));
console.log('(function () { class A { stati', show(() => (function () { class A { static get s() { return 3; } } return A.s; })()));
console.log('(function () { class A { m() {', show(() => (function () { class A { m() { return 1; } } return typeof A.prototype.m; })()));
console.log('(function () { class A {} retu', show(() => (function () { class A {} return Object.keys(new A()).length; })()));
console.log('(function () { class A { x = 1', show(() => (function () { class A { x = 1; } const a = new A(); return [a.x, Object.keys(a).join(",")].join("/"); })()));
console.log('(function () { class A { #p = ', show(() => (function () { class A { #p = 1; get p() { return this.#p; } } return new A().p; })()));
console.log('(function () { class A { #m() ', show(() => (function () { class A { #m() { return 1; } m2() { return this.#m(); } } return new A().m2(); })()));
console.log('(function () { class A { stati', show(() => (function () { class A { static { this.z = 5; } } return A.z; })()));
console.log('(function () { class A { ["m" ', show(() => (function () { class A { ["m" + 1]() { return 1; } } return new A().m1(); })()));
})();
}
main();
