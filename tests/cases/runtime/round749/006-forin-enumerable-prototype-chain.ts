// xl:title `for…in`：原型链上的可枚举键、`null` 原型、数组上的额外自有键
// xl:round 749
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round749 里同判定点的
// 1 条原子探针并成这一条：p749a-a11
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round749/p749a-a11.ts · `for…in`：原型链上的可枚举键与 `null` 原型 =====
await (async () => {
const base: any = { p: 1 };
const child: any = Object.create(base);
child.c = 2;
const seen: string[] = [];
for (const k in child) seen.push(k);
console.log(seen.sort().join(","));
const bare: any = Object.create(null);
bare.x = 1;
const seen2: string[] = [];
for (const k in bare) seen2.push(k);
console.log(seen2.join(","), Object.keys(bare).join(","), Object.getPrototypeOf(bare) === null);
const arr: any = [10, 20];
arr.extra = "e";
const seen3: string[] = [];
for (const k in arr) seen3.push(k);
console.log(seen3.join(","));
})();
}
main();
