// xl:title `return` 后面紧跟函数 / 类表达式：取它的 `name`
// xl:round 758
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round758 里同判定点的
// 1 条原子探针并成这一条：p758a-01-return-then-function-declaration
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round758/p758a-01-return-then-function-declaration.ts · `return` 后面紧跟函数表达式：被读成了函数**声明** ⇒ 整份文件进不来 =====
await (async () => {
// 第 758 轮登记的这条缺口在第 775 轮收掉了：**收法不是改语句切分**（`return function`
// 那一格 token 层给的就是 `[Keyword(return), Function, ...]`，形状本来就是对的），
// 而是 `print-ast-common.xl.md` 的 `projectExpression` 链那一支——
// **链的头一格是函数 / 类时按表达式位投**（`ctx.expressionPosition`），
// 于是 `return function f() {}.name` 投出 `FunctionExpression`。用例留着当守卫。
const show = (v: any) => (v === null ? "null" : (typeof v) + ":" + String(v));
console.log("1", show((function () { return function f() {}.name; })()));
console.log("2", show((function () { return function () {}.name; })()));
console.log("3", show((function () { return (class {}).name; })()));
})();
}
main();
