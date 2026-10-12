// xl:title 嵌套 `try` 的次序、`finally` 里的返回与无绑定 `catch`
// xl:round 748
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round748 里同判定点的
// 1 条原子探针并成这一条：p748a-a07
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round748/p748a-a07.ts · `try` 里 `return` 与 `finally` 同时给值：`finally` 赢 =====
await (async () => {
function f() { try { return 1; } finally { return 2; } }
console.log(f());
function g() { let v = 0; try { return "a"; } finally { v = 1; console.log("side", v); } }
console.log(g());
function h() { for (const x of [1, 2]) { try { if (x === 1) return "first"; } finally { console.log("f" + x); } } return "end"; }
console.log(h());
})();
}
main();
