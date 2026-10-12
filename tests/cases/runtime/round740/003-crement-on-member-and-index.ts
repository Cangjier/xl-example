// xl:title `++` / `--` 打在成员与下标上：四档前后缀的读写回写（含成员链 / 下标链 / 调用结果）
// xl:round 740
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round740 里同判定点的
// 3 条原子探针并成这一条：p740a-a05 · p740a-a18 · p740a-a10
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round740/p740a-a05.ts · 前后缀 `++` / `--` 打在成员与下标上 =====
await (async () => {
const o: any = { n: 1 };
const a: any = [5];
console.log(o.n++, o.n, ++o.n, o.n--, --o.n, o.n);
console.log(a[0]++, a[0], ++a[0], a[0]--, --a[0], a[0]);
})();

// ===== 吸收 tests/cases/runtime/round740/p740a-a18.ts · 前缀 `++` 打在成员链 / 下标链上（写回） =====
await (async () => {
const o: any = { nest: { n: 1 }, list: [10] };
console.log(++o.nest.n, o.nest.n);
console.log(++o.list[0], o.list[0]);
console.log(--o.nest.n, --o.list[0]);
})();

// ===== 吸收 tests/cases/runtime/round740/p740a-a10.ts · 后缀 `++` 与成员链 / 调用结果 =====
await (async () => {
const o: any = { list: [1, 2], n: 0 };
console.log(o.list[0]++, o.list[0]);
console.log(o.n++, o.n++, o.n);
const f = () => { const b: any = { c: 0 }; return b; };
console.log(f().c++, f().c++);
})();
}
main();
