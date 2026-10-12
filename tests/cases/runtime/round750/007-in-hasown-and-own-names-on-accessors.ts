// xl:title `in` / `hasOwn` / `getOwnPropertyNames` 在访问器、不可枚举属性与数组 `length` 上
// xl:round 750
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round750 里同判定点的
// 1 条原子探针并成这一条：p750a-a09
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round750/p750a-a09.ts · `in` / `hasOwn` / `getOwnPropertyNames` 在访问器与不可枚举上 =====
await (async () => {
const o: any = {};
await Object.defineProperty(o, "h", { value: 1, enumerable: false });
await Object.defineProperty(o, "g", { get() { return 2; }, enumerable: true });
console.log("h" in o, Object.hasOwn(o, "h"), Object.keys(o).join(","), Object.getOwnPropertyNames(o).join(","));
console.log(o.h, o.g, Object.getOwnPropertyDescriptor(o, "h")!.enumerable);
const arr: any = [1, 2];
console.log("length" in arr, Object.hasOwn(arr, "length"), Object.keys(arr).join(","), Object.getOwnPropertyNames(arr).join(","));
console.log(Object.hasOwn(arr, 0), Object.hasOwn(arr, "0"), "0" in arr);
})();
}
main();
