// xl:title 解构：默认值只在 `undefined` 时生效、嵌套与剩余、形参默认值
// xl:round 748
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round748 里同判定点的
// 1 条原子探针并成这一条：p748a-a13
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round748/p748a-a13.ts · 解构：默认值只在 `undefined` 时生效、嵌套与剩余 =====
await (async () => {
const f = (a: any = "da", b: any = "db") => a + "|" + b;
console.log(f(), f(null, 0), f(undefined, undefined), f("x"), f(1, 2));
const { p = 1, q = 2 } = { p: undefined, q: null } as any;
console.log(p, q);
const [x = "dx", y = "dy"] = [undefined, null] as any;
console.log(x, y);
const { m: { n = 5 } = {} } = {} as any;
console.log(n);
const { ...rest } = { a: 1, b: 2 } as any;
console.log(JSON.stringify(rest));
})();
}
main();
