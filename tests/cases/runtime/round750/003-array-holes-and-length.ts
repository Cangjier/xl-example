// xl:title 数组的洞与 `length`：`in` / `keys` / 遍历 / 截短与补长
// xl:round 750
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round750 里同判定点的
// 1 条原子探针并成这一条：p750a-a05
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round750/p750a-a05.ts · 数组的洞：`in` / `keys` / 遍历 / `length` 三面 =====
await (async () => {
const a: any[] = [1, , 3];
console.log(0 in a, 1 in a, 2 in a, a.length);
console.log(Object.keys(a).join(","), JSON.stringify(a));
console.log(a.map((v) => "m" + v).join(","));
console.log(a.filter(() => true).length, a.forEach ? (() => { let n = 0; a.forEach(() => n++); return n; })() : -1);
console.log(a.join("-"), [...a].length, Array.from(a).length);
console.log([...a].map((v) => String(v)).join(","), Array.from(a).map((v) => String(v)).join(","));
const b = [1, 2, 3];
b.length = 1;
console.log(b.length, JSON.stringify(b), b[1]);
b.length = 3;
console.log(b.length, JSON.stringify(b), 1 in b);
})();
}
main();
