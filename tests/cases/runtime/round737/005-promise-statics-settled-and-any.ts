// xl:title `Promise` 的静态形状（`allSettled` / `any` / `withResolvers` / `try`）与两条聚合路的产物
// xl:round 737
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round737 里同判定点的
// 1 条原子探针并成这一条：p737a-a15
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round737/p737a-a15.ts · `Promise` 的静态形状：`allSettled` / `any` / `withResolvers` / `try` =====
await (async () => {
console.log(typeof (Promise as any).allSettled, typeof (Promise as any).any, typeof (Promise as any).withResolvers, typeof (Promise as any).try);
Promise.allSettled([1, Promise.reject(new Error("x"))]).then((r: any) => {
  console.log(r.length, r[0].status, r[0].value, r[1].status, r[1].reason.message);
});
Promise.any([Promise.reject(new Error("a")), Promise.reject(new Error("b"))]).catch((e: any) => {
  console.log(e.constructor.name, e.errors.length, e.message);
});
})();
}
main();
