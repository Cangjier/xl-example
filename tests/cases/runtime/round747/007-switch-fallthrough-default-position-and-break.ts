// xl:title `switch` 的贯穿 / `default` 的位置 / `break`
// xl:round 747
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round747 里同判定点的
// 1 条原子探针并成这一条：p747a-a08
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round747/p747a-a08.ts · `switch` 的贯穿 / `default` 位置 / `break` =====
await (async () => {
const f = (n: number) => {
  const out: string[] = [];
  switch (n) { case 1: out.push("one"); case 2: out.push("two"); break; default: out.push("def"); case 3: out.push("three"); }
  return out.join(",");
};
console.log(f(1), "|", f(2), "|", f(3), "|", f(9));
const g = (n: number) => {
  let s = "";
  switch (n) { default: s += "d"; case 0: s += "z"; break; case 1: s += "o"; }
  return s;
};
console.log(g(0), g(1), g(5));
const h = (n: number) => { switch (n) { case 1: return "a"; case 2: return "b"; default: return "z"; } };
console.log(h(1), h(2), h(3));
})();
}
main();
