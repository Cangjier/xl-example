// xl:title `console.log` 的渲染：多实参 / 嵌套 / 换行 / 洞
// xl:round 747
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round747 里同判定点的
// 1 条原子探针并成这一条：p747a-a12
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round747/p747a-a12.ts · `console.log` 的渲染：多实参 / 嵌套 / 换行 / 洞 =====
await (async () => {
console.log(1, "a", true, null, undefined);
console.log([1, [2, [3, [4]]]]);
console.log({ a: 1, b: { c: [1, 2] } });
console.log("a\nb");
console.log();
console.log([, 1], [undefined, 1]);
console.log("x".repeat(3), "y".length);
console.log(new Map([["k", 1]]).size);
})();
}
main();
