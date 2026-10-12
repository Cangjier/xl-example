// xl:title 键的次序与来源：符号键 / 不可枚举键 / 整数键，以及 `defineProperty` 三档与描述符
// xl:round 749
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round749 里同判定点的
// 2 条原子探针并成这一条：p749a-a09 · p749a-a10
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round749/p749a-a09.ts · 对象：符号键 / 不可枚举键 / 整数键的次序 =====
await (async () => {
const s = Symbol("s");
const o: any = { b: 1, 2: "two", a: 2, 1: "one", [s]: "sym" };
console.log(Object.keys(o).join(","));
console.log(Object.getOwnPropertyNames(o).join(","));
console.log(Object.getOwnPropertySymbols(o).length, o[s]);
console.log(JSON.stringify(o));
console.log(Object.values(o).join(","));
o.c = 3;
console.log(Object.keys(o).join(","));
})();

// ===== 吸收 tests/cases/runtime/round749/p749a-a10.ts · 描述符：`defineProperty` 的三档与 `getOwnPropertyDescriptor` =====
await (async () => {
const o: any = {};
await Object.defineProperty(o, "hidden", { value: 1, enumerable: false });
await Object.defineProperty(o, "ro", { value: 2, writable: false, enumerable: true, configurable: false });
o.ro = 99;
o.hidden = 99;
console.log(o.hidden, o.ro, Object.keys(o).join(","));
const d = Object.getOwnPropertyDescriptor(o, "ro") as any;
console.log(d.value, d.writable, d.enumerable, d.configurable);
try { Object.defineProperty(o, "ro", { value: 3 }); } catch (e) { console.log("redefine", (e as Error).constructor.name); }
const acc: any = {};
await Object.defineProperty(acc, "p", { get() { return "G"; }, set(v: any) { console.log("set", v); }, enumerable: true });
console.log(acc.p, Object.keys(acc).join(","));
acc.p = 5;
})();
}
main();
