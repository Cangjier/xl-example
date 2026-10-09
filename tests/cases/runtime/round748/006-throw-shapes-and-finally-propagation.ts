// xl:title 抛出的形状（非 `Error` / 数字 / 对象 / `undefined`）与 `finally` 里的传播
// xl:round 748
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round748 里同判定点的
// 1 条原子探针并成这一条：p748a-a06
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round748/p748a-a06.ts · 抛出的形状：非 `Error`、`undefined`、带 `finally` 的传播 =====
await (async () => {
try { throw "plain"; } catch (e) { console.log(typeof e, e); }
try { throw 42; } catch (e) { console.log(typeof e, e, (e as any).message); }
try { throw { code: "E1" }; } catch (e) { console.log(typeof e, (e as any).code); }
try { throw undefined; } catch (e) { console.log("caught undefined", e); }
function f() { try { throw new Error("boom"); } finally { console.log("fin"); } }
try { f(); } catch (e) { console.log("outer", (e as Error).message); }
})();
}
main();
