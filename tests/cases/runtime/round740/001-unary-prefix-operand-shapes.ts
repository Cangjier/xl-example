// xl:title 一元前缀的操作数形状：成员链 / 调用结果 / 下标链（读出来的值与写回）
// xl:round 740
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round740 里同判定点的
// 4 条原子探针并成这一条：p740a-a01 · p740a-a02 · p740a-a03 · p740a-a16
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round740/p740a-a01.ts · 一元前缀打在**成员链**上（typeof / void / delete / ! / ~ / - / +） =====
await (async () => {
const o: any = { p: 5, s: "x" };
console.log(typeof o.p, typeof o.s);
console.log(void o.p, void o.missing);
console.log(!o.p, ~o.p, -o.p, +o.p);
console.log(delete o.p, o.p);
})();

// ===== 吸收 tests/cases/runtime/round740/p740a-a02.ts · 一元前缀打在**调用**上 =====
await (async () => {
const f = () => ({ v: 1 });
console.log(typeof f(), void f(), !f().v, -f().v);
const g = () => 3;
console.log(typeof g, typeof g(), -g());
})();

// ===== 吸收 tests/cases/runtime/round740/p740a-a03.ts · 一元前缀接**下标**链 =====
await (async () => {
const a: any[] = [1, 2, 3];
console.log(typeof a[0], !a[1], -a[2], ~a[0]);
const m: any = { k: [4] };
console.log(-m.k[0], typeof m["k"][0]);
})();

// ===== 吸收 tests/cases/runtime/round740/p740a-a16.ts · 嵌套一元与调用链的接线（`typeof o[k]().v` 那一族的展开） =====
await (async () => {
const o: any = { k: () => ({ v: 1 }) };
const k = "k";
console.log(typeof o[k]().v, -o[k]().v, !o[k]().v);
console.log(typeof o["k"]().v, typeof o.k().v);
})();
}
main();
