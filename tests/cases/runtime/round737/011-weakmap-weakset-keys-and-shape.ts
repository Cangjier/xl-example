// xl:title `WeakMap` / `WeakSet` 的键与形状（不可迭代、没有 `size` / `keys` / `forEach`）
// xl:round 737
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round737 里同判定点的
// 1 条原子探针并成这一条：p737a-a20
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round737/p737a-a20.ts · `WeakMap` / `WeakSet` 的键与迭代（不可迭代） =====
await (async () => {
const wm = new WeakMap<any, any>();
const k = {};
await wm.set(k, 1);
console.log(wm.get(k), wm.has(k), wm.delete(k));
console.log(typeof (wm as any)[Symbol.iterator], typeof (wm as any).keys, typeof (wm as any).size);
const ws = new WeakSet<any>();
await ws.add(k);
console.log(ws.has(k), typeof (ws as any).forEach);
})();
}
main();
