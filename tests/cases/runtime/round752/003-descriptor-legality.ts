// xl:title 描述符自己的两条合法性：`get` 必须是函数、数据与访问器两族不能混
// xl:round 752
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round752 里同判定点的
// 1 条原子探针并成这一条：p752a-03
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round752/p752a-03.ts · 描述符自己的两条合法性：`get` 必须是函数、数据与访问器两族不能混 =====
await (async () => {
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('Object.defineProperty({}, "a", { value: 1 })', show(() => Object.defineProperty({}, "a", { value: 1 })));
console.log('Object.defineProperty(Object.freeze({ a: 1 }), "a", { value: 2 })', show(() => Object.defineProperty(Object.freeze({ a: 1 }), "a", { value: 2 })));
console.log('Object.defineProperty({}, "a", { get: 1 })', show(() => Object.defineProperty({}, "a", { get: 1 })));
console.log('Object.defineProperty({}, "a", { get() { return 1; }, value: 2 })', show(() => Object.defineProperty({}, "a", { get() { return 1; }, value: 2 })));
})();
}
main();
