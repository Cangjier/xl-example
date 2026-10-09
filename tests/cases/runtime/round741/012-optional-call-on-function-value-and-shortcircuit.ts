// xl:title 可选调用打在函数值上（`f?.()`），以及短路不越过后续链节
// xl:round 741
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round741 里同判定点的
// 2 条原子探针并成这一条：p741a-a12 · p741a-a13
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round741/p741a-a12.ts · 可选调用打在**函数值**上（`f?.()`） =====
await (async () => {
const f: any = (x: any) => x + 1;
const g: any = null;
console.log(f?.(1), g?.(1));
console.log(f?.(1) + 1, typeof g?.());
})();

// ===== 吸收 tests/cases/runtime/round741/p741a-a13.ts · 可选调用的**短路**不越过后续链节 =====
await (async () => {
const log: string[] = [];
const o: any = { a: null };
console.log(o.a?.b.c, log.length);
console.log(o?.missing?.deep.deeper);
})();
}
main();
