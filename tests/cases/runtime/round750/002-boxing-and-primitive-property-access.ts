// xl:title 装箱与原始值上的属性读：`Object(1)` / `new Number` 的形状、`valueOf`、自动装箱与写不进去
// xl:round 750
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round750 里同判定点的
// 2 条原子探针并成这一条：p750a-a03 · p750a-a04
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round750/p750a-a03.ts · 装箱：`Object(1)` / `new Number` 的形状与 `valueOf` =====
await (async () => {
const n = Object(1) as any;
console.log(typeof n, n.valueOf(), n instanceof Number, Object.prototype.toString.call(n));
const s = Object("a") as any;
console.log(typeof s, s.valueOf(), s.length, s[0]);
const b = Object(true) as any;
console.log(typeof b, b.valueOf(), b instanceof Boolean);
console.log(typeof Object(1), Object(1) + 1, Object(1) === 1);
const boxed = new Number(3);
console.log(typeof boxed, boxed + 1, boxed == 3 as any, boxed === (3 as any));
console.log(Object.keys(Object("ab") as any).join(","));
})();

// ===== 吸收 tests/cases/runtime/round750/p750a-a04.ts · 原始值上的属性读：`"abc".length` / 数字的方法 / 自动装箱 =====
await (async () => {
// 第 750 轮登记的那一格（第 5 行 `n["toFixed"] === Number.prototype.toFixed`）在第 777 轮
// 收掉了：**根是 `get_index` 自己多出来的一句早退**（`!IsObject() ⇒ undefined`），
// 而点号那一路（`RtOp.GetProp`）一直无条件交给 `GetProperty`（它自己会装箱）。
// 用例留着当守卫。下面那几行钉的仍是这一族的其余面。
console.log("abc".length, "abc"[1], (1).toString(), (1.5).toFixed(1));
console.log((123).toString().length, true.toString(), (true as any).valueOf());
let s: any = "abc";
console.log(s.length, s[0], s.toUpperCase());
s.x = 1;
console.log(s.x, typeof s.x);
const n: any = 5;
console.log(n.toFixed(2), n["toFixed"] === Number.prototype.toFixed);
console.log("abc".length, (5).constructor === Number);
})();
}
main();
