// xl:title `preventExtensions` / `freeze` 在嵌套对象、数组与空对象上的落点
// xl:round 750
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round750 里同判定点的
// 1 条原子探针并成这一条：p750a-a07
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round750/p750a-a07.ts · 对象的整体操作：`preventExtensions` / `freeze` 在嵌套与数组上 =====
await (async () => {
const o: any = { a: { b: 1 } };
await Object.preventExtensions(o);
o.c = 1;
console.log("c" in o, Object.isExtensible(o), delete o.a, "a" in o);
const deep: any = { a: { b: 1 } };
await Object.preventExtensions(deep);
deep.a.b = 2;
console.log(deep.a.b);
const a: any = [1, 2];
await Object.freeze(a);
console.log(Object.isFrozen(a), Object.isFrozen([1]), Object.isFrozen({}));
a[0] = 9;
try { a.push(3); } catch (e) { console.log("push", (e as Error).constructor.name); }
console.log(JSON.stringify(a), a.length);
console.log(Object.isExtensible(Object.freeze({})), Object.isSealed(Object.freeze({})));
})();
}
main();
