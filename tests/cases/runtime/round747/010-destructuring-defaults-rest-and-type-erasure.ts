// xl:title 解构 + 默认值 + 剩余，以及类型注解与 `satisfies` 的剥离
// xl:round 747
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round747 里同判定点的
// 1 条原子探针并成这一条：p747a-a11
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round747/p747a-a11.ts · 解构 + 默认值 + 剩余，以及类型注解与 `satisfies` 的剥离 =====
await (async () => {
const f = (a: number, b: string = "x", { c = 1, d = 2 }: any = {}) => [a, b, c, d].join(",");
console.log(f(1), f(1, "y"), f(1, "y", { c: 3, d: 4 }));
const g = (...rest: number[]) => rest.length;
console.log(g(), g(1), g(1, 2, 3));
const h = ([a, b]: number[] = [7, 8]) => a + b;
console.log(h(), h([1, 2]));
const x = 1 as number;
const y = "s" satisfies string;
console.log(x, y, typeof x, typeof y);
const id = <T,>(v: T): T => v;
console.log((id as any)(5), (id as any)("s"), (id as any)(true));
const box: { v: number } = { v: 1 };
console.log(box.v, Object.keys(box).join(","));
const key = "k";
const { [key]: got } = { k: 7 } as any;
console.log(got);
})();
}
main();
