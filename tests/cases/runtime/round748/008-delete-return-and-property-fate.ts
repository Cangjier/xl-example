// xl:title `delete` 的返回值与属性去向（成员 / 不存在的键 / 字符串下标 / 冻结 / 原始值）
// xl:round 748
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round748 里同判定点的
// 1 条原子探针并成这一条：p748a-a08
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round748/p748a-a08.ts · 删除进行中的名字：`delete` 的返回值与属性去向 =====
await (async () => {
// **第 778 轮转绿**（台账按规矩撤掉，用例留着当守卫）：这一条原来记的是
// `delete 字符串下标` 给 `true`（Node 给 `false`——`"abc"[0]` 那一格**不可配置**）。
// 第 778 轮在 `vm.xl.md` 的 `del_prop` 里给**字符串接收者**单开了一档：
// 「`length` 或落在长度以内的下标 ⇒ `false`」，判据就是本文件第 3 行。
// xl:end
const o: any = { a: 1, b: 2 };
console.log(delete o.a, "a" in o, o.a, Object.keys(o).join(","));
console.log(delete (o as any).missing, delete o["b"]);
const s = "abc";
console.log(delete (s as any)[0], s[0]);
const frozen = Object.freeze({ k: 1 });
console.log(delete (frozen as any).k, frozen.k);
console.log(delete (1 as any).x);
})();
}
main();
