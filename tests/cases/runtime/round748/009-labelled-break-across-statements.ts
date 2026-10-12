// xl:title 标签与 `break`：裸块 / 多层标签 / `switch` / `try` / `while`
// xl:round 748
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round748 里同判定点的
// 2 条原子探针并成这一条：p748a-a09 · p748a-a10
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round748/p748a-a09.ts · 标签：`break` 打在裸块 / `try` / 多层标签上 =====
await (async () => {
lbl: { console.log("in"); break lbl; console.log("unreachable"); }
console.log("after block");
first: second: for (let i = 0; i < 3; i++) { if (i === 1) continue first; if (i === 2) break second; console.log("L" + i); }
outer: for (let i = 0; i < 2; i++) { for (let j = 0; j < 2; j++) { if (j === 1) continue outer; console.log(i, j); } }
console.log("done");
})();

// ===== 吸收 tests/cases/runtime/round748/p748a-a10.ts · 标签：`break` 打在 `switch` 与 `try` 上 =====
await (async () => {
sw: switch (1) { case 1: console.log("case1"); break sw; console.log("no"); }
console.log("after switch");
t: try { console.log("in try"); } finally { console.log("finally"); }
console.log("after try");
w: while (true) { try { break w; } finally { console.log("wfin"); } }
console.log("after while");
})();
}
main();
