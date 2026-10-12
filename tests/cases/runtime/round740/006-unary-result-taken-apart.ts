// xl:title 一元前缀的结果再取成员 / 调用（括号那一档），以及 `typeof` 打在函数表达式 / 类表达式 / 箭头上
// xl:round 740
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round740 里同判定点的
// 2 条原子探针并成这一条：p740a-a08 · p740a-a11
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round740/p740a-a08.ts · 一元前缀的结果再取成员 / 调用（括号那一档） =====
await (async () => {
const o: any = { p: "abcdef" };
console.log((!o.p).toString(), (-o.p.length).toString());
console.log((typeof o.p).length, (void 0) === undefined);
console.log((!0).valueOf(), (!!1).valueOf());
})();

// ===== 吸收 tests/cases/runtime/round740/p740a-a11.ts · `typeof` 打在**函数表达式 / 类表达式 / 箭头**上 =====
await (async () => {
console.log(typeof function () {});
console.log(typeof (() => 1));
console.log(typeof class { });
const C = class { };
console.log(typeof C);
})();
}
main();
