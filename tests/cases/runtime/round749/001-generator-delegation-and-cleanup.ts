// xl:title 生成器：`yield*` 委托与 `return` / `throw` 的透传，`for..of` 提前退出时的清扫
// xl:round 749
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round749 里同判定点的
// 2 条原子探针并成这一条：p749a-a01 · p749a-a02
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round749/p749a-a01.ts · 生成器：`yield*` 委托与 `return` / `throw` 的透传 =====
await (async () => {
function* inner() { try { yield 1; yield 2; } finally { console.log("inner fin"); } }
function* outer() { const got = yield* inner(); console.log("got", got); yield 3; }
const it = outer();
console.log(it.next().value, it.next().value, it.next().value, JSON.stringify(it.next()));
console.log("---");
function* g2() { yield* [10, 20]; yield* "ab"; }
console.log([...g2()].join(","));
function* g3() { yield 1; }
const i3 = g3();
console.log(i3.next().value, JSON.stringify(i3.next()), JSON.stringify(i3.next()));
})();

// ===== 吸收 tests/cases/runtime/round749/p749a-a02.ts · 生成器：`return()` / `throw()` 与 `for..of` 的提前退出清扫 =====
await (async () => {
function* g() { try { yield 1; yield 2; } finally { console.log("cleanup"); } }
const it = g();
console.log(it.next().value, JSON.stringify(it.return(9)));
console.log("---");
function* h() { try { yield 1; } catch (e) { console.log("caught", e); yield 2; } finally { console.log("h fin"); } }
const ih = h();
console.log(ih.next().value);
console.log(JSON.stringify(ih.throw("boom")));
console.log("---");
for (const v of (function* () { try { yield 1; yield 2; } finally { console.log("loop fin"); } })()) {
  console.log("v", v);
  break;
}
})();
}
main();
