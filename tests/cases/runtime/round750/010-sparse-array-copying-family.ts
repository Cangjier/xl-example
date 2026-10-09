// xl:title 稀疏与密集的传递：`concat` / `slice` / `splice` / `toSpliced` / 展开 / `flatMap`
// xl:round 750
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round750 里同判定点的
// 1 条原子探针并成这一条：p750a-a12
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round750/p750a-a12.ts · 稀疏与密集的传递：`concat` / `slice` / `splice` / 展开 =====
await (async () => {
const a: any[] = [1, , 3];
console.log(JSON.stringify(a.concat([4])), a.concat([4]).length);
console.log(JSON.stringify(a.slice()), a.slice().length, 1 in a.slice());
console.log(JSON.stringify([...a]), 1 in [...a]);
const b: any[] = [1, 2, 3];
const removed = b.splice(1, 1);
console.log(JSON.stringify(b), JSON.stringify(removed), b.length);
const c: any[] = [1, 2, 3, 4];
console.log(JSON.stringify(c.toSpliced(1, 2)), JSON.stringify(c));
console.log(JSON.stringify([1, 2].flatMap((v) => (v === 1 ? [, 9] : [v]))));
})();
}
main();
