// xl:title 闭包捕获：`var` 的共享格与 `let` / `const` 的每轮新格
// xl:round 748
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round748 里同判定点的
// 1 条原子探针并成这一条：p748a-a14
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round748/p748a-a14.ts · 闭包：`var` 的共享格与 `let` 的每轮新格 =====
await (async () => {
const a: Array<() => number> = [];
for (var i = 0; i < 3; i++) a.push(() => i);
console.log(a.map((f) => f()).join(","));
const b: Array<() => number> = [];
for (let j = 0; j < 3; j++) b.push(() => j);
console.log(b.map((f) => f()).join(","));
const c: Array<() => number> = [];
for (const k of [1, 2, 3]) c.push(() => k);
console.log(c.map((f) => f()).join(","));
let d: Array<() => number> = [];
{ for (let m = 0; m < 2; m++) d.push(() => m); }
console.log(d.map((f) => f()).join(","));
})();
}
main();
