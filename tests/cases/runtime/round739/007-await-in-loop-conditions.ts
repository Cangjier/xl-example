// xl:title 循环条件里的 `await`（`while` 与 `for`）
// xl:round 739
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round739 里同判定点的
// 1 条原子探针并成这一条：p739a-a13
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round739/p739a-a13.ts · 循环条件里的 `await` =====
await (async () => {
async function main() {
  let i = 0;
  while (await Promise.resolve(i) < 3) i += 1;
  console.log(i);
  for (let k = 0; await Promise.resolve(k) < 2; k += 1) {
    console.log("k" + k);
  }
}
await main();
})();
}
main();
