// xl:title 调用形状：`call` / `apply` / `bind` 的返回值、`this`、`length` 与 `name`
// xl:round 749
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round749 里同判定点的
// 1 条原子探针并成这一条：p749a-a13
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round749/p749a-a13.ts · 调用形状：`call` / `apply` / `bind` 的返回值与 `this` =====
await (async () => {
function f(this: any, a: number, b: number) { return `${this.v}:${a}:${b}`; }
console.log(f.call({ v: 1 }, 2, 3), f.apply({ v: 4 }, [5, 6]));
const bound = f.bind({ v: 7 }, 8);
console.log(bound(9), bound.length, bound.name);
console.log(f.call(null as any, 1, 2).startsWith("undefined"), typeof f.apply);
class C { v = 1; m(...xs: number[]) { return this.v + xs.length; } }
const c = new C();
console.log(c.m.call({ v: 5 }, 1, 2), C.prototype.m.length);
})();
}
main();
