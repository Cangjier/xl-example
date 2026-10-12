// xl:title 数字边界：`NaN` / `Infinity` / `-0` 的渲染、比较与 `Object.is`
// xl:round 750
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round750 里同判定点的
// 1 条原子探针并成这一条：p750a-a10
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round750/p750a-a10.ts · 数字边界：`NaN` / `Infinity` / `-0` 的渲染与比较 =====
await (async () => {
console.log(NaN, Infinity, -Infinity, -0, 1 / 0, -1 / 0);
console.log(String(-0), (-0).toString(), JSON.stringify(-0), JSON.stringify([-0]));
console.log(-0 === 0, Object.is(-0, 0), [0].indexOf(-0), [-0].includes(0));
console.log(NaN === NaN, [NaN].indexOf(NaN), [NaN].includes(NaN));
console.log(Number.isNaN("NaN" as any), isNaN("NaN" as any), Number.isNaN(undefined as any));
console.log(Math.max(NaN, 1), Math.min(0, -0), 0 / 0, 1 % 0);
console.log((0.1 + 0.2).toString(), (1e21).toString(), (1e-7).toString());
})();
}
main();
