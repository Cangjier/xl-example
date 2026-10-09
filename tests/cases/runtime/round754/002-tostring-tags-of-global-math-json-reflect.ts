// xl:title 全局对象 / `Math` / `JSON` / `Reflect` 的 `Symbol.toStringTag` 与自有键数
// xl:round 754
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round754 里同判定点的
// 1 条原子探针并成这一条：p754c-01
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round754/p754c-01.ts · 全局对象 / `Math` / `JSON` / `Reflect` 的 `Symbol.toStringTag` =====
await (async () => {
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('Object.prototype.toString.call', show(() => Object.prototype.toString.call(globalThis)));
console.log('(globalThis as any)[Symbol.toS', show(() => (globalThis as any)[Symbol.toStringTag]));
console.log('JSON.stringify(Object.getOwnPr', show(() => JSON.stringify(Object.getOwnPropertyDescriptor(globalThis, Symbol.toStringTag))));
console.log('(function (this: any) { return', show(() => (function (this: any) { return Object.prototype.toString.call(this); }).call(null)));
console.log('(function (this: any) { return', show(() => (function (this: any) { return this === globalThis; }).call(undefined)));
console.log('(function (this: any) { return', show(() => (function (this: any) { return (this as any)[Symbol.toStringTag]; }).call(null)));
console.log('Object.prototype.toString.call', show(() => Object.prototype.toString.call(Math)));
console.log('Object.prototype.toString.call', show(() => Object.prototype.toString.call(JSON)));
console.log('Object.prototype.toString.call', show(() => Object.prototype.toString.call(Reflect)));
console.log('typeof Reflect.get', show(() => typeof Reflect.get));
console.log('typeof Reflect.ownKeys', show(() => typeof Reflect.ownKeys));
console.log('Object.keys(Math).length', show(() => Object.keys(Math).length));
console.log('Object.keys(JSON).length', show(() => Object.keys(JSON).length));
console.log('Object.keys(Reflect).length', show(() => Object.keys(Reflect).length));
console.log('(Math as any)[Symbol.toStringT', show(() => (Math as any)[Symbol.toStringTag]));
console.log('(JSON as any)[Symbol.toStringT', show(() => (JSON as any)[Symbol.toStringTag]));
console.log('(Reflect as any)[Symbol.toStri', show(() => (Reflect as any)[Symbol.toStringTag]));
})();
}
main();
