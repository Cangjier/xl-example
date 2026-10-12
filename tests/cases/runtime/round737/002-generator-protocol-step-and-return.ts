// xl:title 生成器的四档：`yield` 的返回值与 `next(实参)` 注入、`yield*` 委托（值 / 返回值 / `throw` 传递）、生成器对象自己是可迭代的、`return` 与 `finally` 的次序
// xl:round 737
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round737 里同判定点的
// 4 条原子探针并成这一条：p737a-a07 · p737a-a08 · p737a-a09 · p737a-a10
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round737/p737a-a07.ts · `yield` 的**返回值**与 `next(实参)` 的注入 =====
await (async () => {
function* g() {
  const a = yield 1;
  const b = yield a + 1;
  return a + b;
}
const it = g();
console.log(JSON.stringify(it.next()));
console.log(JSON.stringify(it.next(10)));
console.log(JSON.stringify(it.next(100)));
console.log(JSON.stringify(it.next(1000)));
})();

// ===== 吸收 tests/cases/runtime/round737/p737a-a08.ts · `yield*` 委托：值、返回值与 `throw` 的传递 =====
await (async () => {
function* inner() { yield 1; yield 2; return "R"; }
function* outer() { const r = yield* inner(); yield "got:" + r; }
console.log([...outer()].join(","));
function* pass() { try { yield 1; } catch (e: any) { yield "caught:" + e.message; } }
const it = pass();
console.log(JSON.stringify(it.next()));
console.log(JSON.stringify(it.throw(new Error("x"))));
})();

// ===== 吸收 tests/cases/runtime/round737/p737a-a09.ts · 生成器对象自己是可迭代的（`Symbol.iterator` 给回自己） =====
await (async () => {
function* g() { yield 1; yield 2; }
const it = g();
console.log(it[Symbol.iterator]() === it, [...it].join(","));
console.log([...it].join(","));
const it2 = g();
const [a, b] = it2;
console.log(a, b);
console.log(Object.prototype.toString.call(g()), typeof it.next, typeof it.return);
})();

// ===== 吸收 tests/cases/runtime/round737/p737a-a10.ts · 生成器里 `return` / `finally` 的次序（`for..of` 提前退出） =====
await (async () => {
const log: string[] = [];
function* g() {
  try { yield 1; yield 2; } finally { log.push("fin"); }
  log.push("after");
}
for (const v of g()) { log.push("got:" + v); if (v === 1) break; }
console.log(log.join("|"));
const log2: string[] = [];
function* h() { try { yield 1; } finally { log2.push("fin-h"); } }
const ih = h();
console.log(JSON.stringify(ih.return(9)), log2.join("|"), JSON.stringify(ih.next()));
})();
}
main();
