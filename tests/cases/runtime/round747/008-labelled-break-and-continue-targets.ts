// xl:title 标签：`break` / `continue` 打在嵌套循环、`try` 与裸块上
// xl:round 747
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round747 里同判定点的
// 1 条原子探针并成这一条：p747a-a09
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round747/p747a-a09.ts · 标签：`break` / `continue` 打在嵌套循环、`try`、裸块上 =====
await (async () => {
outer: for (let i = 0; i < 3; i++) {
  for (let j = 0; j < 3; j++) {
    if (j === 1) continue outer;
    if (i === 2) break outer;
    console.log(i, j);
  }
}
first: second: for (let i = 0; i < 3; i++) {
  if (i === 1) continue first;
  if (i === 2) break second;
  console.log("L" + i);
}
lbl: { console.log("in"); break lbl; console.log("not here"); }
tryLbl: try { console.log("t1"); break tryLbl; } finally { console.log("tf"); }
console.log("done");
})();
}
main();
