// xl:title `do…while` / 空语句 / 逗号表达式 / 嵌套三元 / 多变量 `for`
// xl:round 749
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round749 里同判定点的
// 1 条原子探针并成这一条：p749a-a14
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round749/p749a-a14.ts · `do…while` / 空语句 / 逗号表达式 / 嵌套三元 =====
await (async () => {
let i = 0;
do { i++; } while (i < 3);
console.log(i);
let j = 5;
do { j++; } while (false);
console.log(j);
;;
const k = (1, 2, 3);
console.log(k);
console.log(true ? false ? "a" : "b" : "c", false ? "d" : true ? "e" : "f");
let n = 0;
for (let a = 0, b = 10; a < b; a++, b--) n++;
console.log(n);
label: do { break label; } while (true);
console.log("done");
})();
}
main();
