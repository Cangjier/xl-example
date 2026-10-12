// xl:title `await` 与逻辑 / 空值合并的紧密度，以及逻辑短路下的副作用次序
// xl:round 739
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round739 里同判定点的
// 2 条原子探针并成这一条：p739a-a02 · p739a-a16
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round739/p739a-a02.ts · `await` 与逻辑 / 空值合并的紧密度 =====
await (async () => {
async function main() {
  console.log(await Promise.resolve(0) && "T");
  console.log(await Promise.resolve(1) && "T");
  console.log(await Promise.resolve(0) || "F");
  console.log(await Promise.resolve(null) ?? "N");
  console.log(await Promise.resolve(1) && await Promise.resolve(2));
}
await main();
})();

// ===== 吸收 tests/cases/runtime/round739/p739a-a16.ts · `await` 与副作用次序（逻辑短路） =====
await (async () => {
const log: string[] = [];
const mark = (v: any) => { log.push(String(v)); return Promise.resolve(v); };
async function main() {
  console.log(await mark(0) || "d");
  console.log(log.join(","));
  console.log(await mark(1) && "T");
  console.log(log.join(","));
}
await main();
})();
}
main();
