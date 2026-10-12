// xl:title 逻辑运算符与可选链的短路范围、返回原值
// xl:round 747
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round747 里同判定点的
// 1 条原子探针并成这一条：p747a-a10
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round747/p747a-a10.ts · 逻辑运算符与可选链的短路范围、返回原值 =====
await (async () => {
const log: string[] = [];
const f = (v: any) => { log.push("f" + v); return v; };
console.log(f(0) || f("a"), log.join(","));
console.log(f(1) && f("b"), log.join(","));
console.log((null as any) ?? f("c"), log.join(","));
console.log((0 as any) ?? f("d"), log.join(","));
console.log((undefined as any)?.x, (null as any)?.y);
console.log("" || false || 0 || "last", 1 && 2 && 3);
const o: any = { a: { b: () => 1 }, m: () => ({ c: 2 }) };
console.log(o.a.b(), o.m().c, o?.a?.b(), o?.["a"]?.["b"]?.());
const n: any = null;
console.log(n?.a, n?.a?.b, n?.m?.(), n?.["x"]);
console.log(o.missing?.(), o.a.missing?.());
console.log(o.a?.missing ?? "fallback");
})();
}
main();
