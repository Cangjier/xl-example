// xl:title `try` / `catch` / `finally` 与 `return` / `continue` 的次序
// xl:round 747
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round747 里同判定点的
// 1 条原子探针并成这一条：p747a-a07
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round747/p747a-a07.ts · `try` / `catch` / `finally` 与 `return` / `continue` 的次序 =====
await (async () => {
function f() { try { return "try"; } finally { console.log("fin1"); } }
console.log(f());
function g() { try { return "a"; } finally { return "b"; } }
console.log(g());
function h() { try { throw new Error("x"); } catch (e) { return "c"; } finally { console.log("fin2"); } }
console.log(h());
function i() {
  for (const v of [1, 2, 3]) {
    try { if (v === 2) continue; console.log("body" + v); } finally { console.log("f" + v); }
  }
}
await i();
function j() {
  let s = "";
  try { s += "t"; throw new Error("e"); } catch { s += "c"; } finally { s += "f"; }
  return s;
}
console.log(j());
})();
}
main();
