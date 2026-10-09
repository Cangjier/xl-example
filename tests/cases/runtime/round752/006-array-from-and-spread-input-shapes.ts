// xl:title `Array.from` / 展开：类数组、可迭代、映射器与 `thisArg`
// xl:round 752
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round752 里同判定点的
// 1 条原子探针并成这一条：p752a-06
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round752/p752a-06.ts · `Array.from` / 展开：类数组、可迭代、映射器与 `thisArg` =====
await (async () => {
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('Array.from({ length: 2, ', show(() => Array.from({ length: 2, 0: "a" })));
console.log('Array.from({ length: 2, ', show(() => Array.from({ length: 2, 0: "a" }, (v) => v)));
console.log('Array.from(new Set([1, 2', show(() => Array.from(new Set([1, 2]))));
console.log('Array.from("ab")', show(() => Array.from("ab")));
console.log('Array.from(1 as any)', show(() => Array.from(1 as any)));
console.log('[...({ length: 2, 0: "a"', show(() => [...({ length: 2, 0: "a" } as any)]));
})();
}
main();
