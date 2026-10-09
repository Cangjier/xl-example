// xl:title 一元前缀在实参 / 数组字面量 / 对象值 / 模板串里
// xl:round 740
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round740 里同判定点的
// 1 条原子探针并成这一条：p740a-a13
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round740/p740a-a13.ts · 一元前缀在**实参 / 数组 / 对象值 / 模板**里 =====
await (async () => {
const o: any = { p: 3 };
console.log([-o.p, !o.p, typeof o.p].join("|"));
console.log({ a: -o.p, b: typeof o.p }.a, { a: -o.p, b: typeof o.p }.b);
console.log(`v=${-o.p}/${typeof o.p}`);
})();
}
main();
