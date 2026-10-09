// xl:title 原始值接收者：`setPrototypeOf` / `defineProperty` / `keys` / `hasOwn` / `freeze` / `getPrototypeOf` / `preventExtensions` 该抛的都抛
// xl:round 750
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round750 里同判定点的
// 2 条原子探针并成这一条：p750a-a01 · p750a-a02
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round750/p750a-a01.ts · 原始值接收者：`setPrototypeOf` / `defineProperty` 该抛的都抛 =====
await (async () => {
const show = (f: () => any) => { try { return "ok:" + String(f()); } catch (e) { return "throw:" + (e as Error).constructor.name; } };
console.log(show(() => Object.setPrototypeOf(1 as any, {} as any)));
console.log(show(() => Object.setPrototypeOf("s" as any, null as any)));
console.log(show(() => Object.defineProperty(1 as any, "x", { value: 1 })));
console.log(show(() => Object.defineProperty("s" as any, "x", { value: 1 })));
console.log(show(() => Object.defineProperty(null as any, "x", { value: 1 })));
console.log(show(() => Reflect.defineProperty(1 as any, "x", { value: 1 })));
})();

// ===== 吸收 tests/cases/runtime/round750/p750a-a02.ts · 原始值接收者：`Object.keys` / `hasOwn` / `freeze` 三格 =====
await (async () => {
const show = (f: () => any) => { try { return "ok:" + JSON.stringify(f()); } catch (e) { return "throw:" + (e as Error).constructor.name; } };
console.log(show(() => Object.keys(1 as any)), show(() => Object.keys("ab" as any)));
console.log(show(() => Object.getOwnPropertyNames(1 as any)), show(() => Object.getOwnPropertyNames("ab" as any)));
console.log(show(() => Object.hasOwn(1 as any, "x")), show(() => Object.hasOwn("ab" as any, 0)), show(() => Object.hasOwn("ab" as any, "length")));
console.log(show(() => Object.freeze(1 as any)), show(() => Object.isFrozen(1 as any)), show(() => Object.isSealed("s" as any)));
console.log(show(() => Object.getPrototypeOf(1 as any) === Number.prototype));
console.log(show(() => Object.preventExtensions(1 as any)));
})();
}
main();
