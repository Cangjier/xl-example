// xl:title 比较与相等：`==` 的七种组合、字符串与数字的关系比较、`null` / `undefined` 的次序
// xl:round 750
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round750 里同判定点的
// 1 条原子探针并成这一条：p750a-a11
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round750/p750a-a11.ts · 比较与相等：`==` 的七种组合与 `Object.is` =====
await (async () => {
console.log(null == undefined, null === undefined, null == 0, undefined == 0);
console.log("1" == 1, "1" === 1, true == 1, false == "", "" == 0);
console.log([] == "", [0] == 0, [1, 2] == "1,2", ({} as any) == "[object Object]");
console.log(NaN == NaN, Object.is(NaN, NaN), 0 == -0, Object.is(0, -0));
console.log("a" < "b", "10" < "9", 10 < 9, [2] > [1]);
console.log(null >= 0, null > 0, undefined < 1);
})();
}
main();
