// xl:title 异常：嵌套 `try` 的次序与 `finally` 里的返回
// xl:round 749
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round749 里同判定点的
// 1 条原子探针并成这一条：p749a-a16
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round749/p749a-a16.ts · 异常：嵌套 `try` 的次序与 `finally` 里的返回 =====
await (async () => {
function f() {
  try {
    try { throw new Error("inner"); } finally { console.log("f1"); }
  } catch (e) { console.log("c1", (e as Error).message); return "r1"; } finally { console.log("f2"); }
}
console.log(f());
function g() { try { return "try"; } finally { console.log("gf"); } }
console.log(g());
function h() { try { throw "x"; } catch { console.log("no binding"); return "nb"; } }
console.log(h());
try { try { throw new Error("deep"); } finally { console.log("df"); } } catch (e) { console.log("outer", (e as Error).message); }
})();
}
main();
