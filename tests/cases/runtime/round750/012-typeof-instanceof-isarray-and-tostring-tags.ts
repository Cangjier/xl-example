// xl:title `typeof` / `instanceof` / `Array.isArray` / `Object.prototype.toString` 在包装对象与原始值上
// xl:round 750
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round750 里同判定点的
// 1 条原子探针并成这一条：p750a-a14
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round750/p750a-a14.ts · `typeof` / `instanceof` / `Array.isArray` 在包装对象与原始值上 =====
await (async () => {
console.log(typeof new Number(1), typeof 1, typeof Object(1));
console.log(new Number(1) instanceof Number, Object(1) instanceof Number, 1 instanceof Number);
console.log(Array.isArray(Object(1) as any), Array.isArray([1]), Array.isArray("a" as any));
console.log(typeof null, typeof undefined, typeof (() => {}), typeof Symbol());
console.log([] instanceof Array, [] instanceof Object, "s" instanceof String, true instanceof Boolean);
console.log(Object.prototype.toString.call(1), Object.prototype.toString.call("s"), Object.prototype.toString.call(true));
})();
}
main();
