// xl:title `in` 与 `hasOwn`：原型链上的名字算、数组下标与洞算、`length` 那一格
// xl:round 748
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round748 里同判定点的
// 1 条原子探针并成这一条：p748a-a04
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round748/p748a-a04.ts · `in`：原型链上的名字算、数组下标算 =====
await (async () => {
const base = { a: 1 };
const o: any = Object.create(base);
o.b = 2;
console.log("a" in o, "b" in o, "c" in o, "toString" in o, "hasOwnProperty" in o);
console.log(Object.hasOwn(o, "a"), Object.hasOwn(o, "b"));
const arr = [7, , 9];
console.log(0 in arr, 1 in arr, 2 in arr, "length" in arr, 3 in arr);
console.log("a" in { a: undefined }, "0" in ["x"]);
})();
}
main();
