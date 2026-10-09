// xl:title `this` 的四种绑定与箭头函数的词法 `this`
// xl:round 747
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round747 里同判定点的
// 1 条原子探针并成这一条：p747a-a04
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round747/p747a-a04.ts · `this` 的四种绑定与箭头函数的词法 `this` =====
await (async () => {
function show(v: any) { return v === undefined ? "undefined" : typeof v + ":" + String(v); }
const o = { v: 1, m() { return this.v; } };
console.log(o.m());
const f: any = o.m;
try { console.log("direct " + show(f())); } catch (e) { console.log("throw " + (e as Error).constructor.name); }
console.log(o.m.bind({ v: 9 })(), o.m.call({ v: 8 }), o.m.apply({ v: 7 }));
class C { v = 5; m() { return this.v; } }
const c = new C();
console.log(c.m(), (c.m as any).call(c));
function outer() { return (() => typeof this)(); }
console.log(outer.call({ k: 1 }));
const obj = { k: 2, arrow() { return (() => this.k)(); } };
console.log(obj.arrow());
})();
}
main();
