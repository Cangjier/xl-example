// xl:title 前缀套前缀（`!!` / `~~` / `- -` / `+ +` / `typeof typeof` / `typeof void` / `void typeof`）与一元对 `**` 的紧密度
// xl:round 740
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round740 里同判定点的
// 1 条原子探针并成这一条：p740a-a06
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round740/p740a-a06.ts · 前缀套前缀（`!!` / `~~` / `- -` / `typeof typeof`） =====
await (async () => {
console.log(!!1, !!0, ~~2.7, - -3, + +4);
console.log(typeof typeof 1, typeof void 0, void typeof 1);
console.log(-(2 ** 2), (-2) ** 2);
})();
}
main();
