// xl:title `delete` 打在各种目标上：成员 / 下标 / 方法 / 不存在的键 / 括号·`as`·`!` 包着的成员
// xl:round 740
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round740 里同判定点的
// 2 条原子探针并成这一条：p740a-a04 · p740a-a17
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round740/p740a-a04.ts · `delete` 打在成员 / 下标 / 调用上 =====
await (async () => {
const o: any = { p: 1, m() { return 2; } };
const a: any = [1, 2];
console.log(delete o.p, "p" in o);
console.log(delete a[0], a[0], a.length);
console.log(delete o.nope);
console.log(delete o.m, typeof o.m);
})();

// ===== 吸收 tests/cases/runtime/round740/p740a-a17.ts · `delete` 打在**括号 / as / !** 包着的成员上（第 740 轮收掉） =====
await (async () => {
const o: any = { b: 2, c: 3, d: 4 };
console.log(delete (o.b as any), o.b);
console.log(delete (o.c), o.c);
console.log(delete (o.d!), o.d);
})();
}
main();
