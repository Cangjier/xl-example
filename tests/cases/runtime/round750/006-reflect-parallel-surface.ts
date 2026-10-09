// xl:title `Reflect` 与 `Object` 同名的那一套口径（`has` / `get` / `set` / `ownKeys` / `apply` / `construct`）
// xl:round 750
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round750 里同判定点的
// 1 条原子探针并成这一条：p750a-a08
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round750/p750a-a08.ts · `Reflect` 与 `Object` 同名的两套口径 =====
await (async () => {
const o: any = { a: 1 };
console.log(Reflect.has(o, "a"), Reflect.get(o, "a"), Reflect.set(o, "b", 2), o.b);
console.log(Reflect.deleteProperty(o, "b"), "b" in o, Reflect.ownKeys(o).join(","));
console.log(Reflect.isExtensible(o), Reflect.preventExtensions(o), Reflect.isExtensible(o));
console.log(Reflect.getPrototypeOf(o) === Object.prototype, Reflect.setPrototypeOf(o, null), Reflect.getPrototypeOf(o));
console.log(Reflect.apply(Math.max, null, [1, 3, 2]), Reflect.construct(Array, [3]).length);
})();
}
main();
