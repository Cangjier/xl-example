// xl:title 迭代协议的三条边：`for..of` 提前离开要调 `return()`、数组解构走迭代协议、不可迭代物抛 `TypeError` 与各种可迭代物的构造（数组 / 字符串 / 生成器）
// xl:round 737
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round737 里同判定点的
// 3 条原子探针并成这一条：p737a-a04 · p737a-a06 · p737a-a14
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round737/p737a-a04.ts · `for..of` 里 `break` / `return` 要调迭代器的 `return()` =====
await (async () => {
const log: string[] = [];
const src: any = {
  [Symbol.iterator]() {
    let i = 0;
    return {
      next() { i += 1; return { value: i, done: i > 5 }; },
      return(v: any) { log.push("return:" + v); return { value: v, done: true }; },
    };
  },
};
for (const v of src) { if (v === 2) break; }
console.log(log.join("|"));
function f() { for (const v of src) { if (v === 3) return "out"; } return "end"; }
console.log(f(), log.join("|"));
})();

// ===== 吸收 tests/cases/runtime/round737/p737a-a06.ts · 数组解构走的是**迭代协议**（不是下标） =====
await (async () => {
const src: any = {
  [Symbol.iterator]() {
    let i = 0;
    return { next: () => (i < 3 ? { value: "v" + ++i, done: false } : { value: undefined, done: true }) };
  },
};
const [a, b, ...rest] = src;
console.log(a, b, rest.join(","));
const [x, , y] = [1, 2, 3];
console.log(x, y);
const [p = "d", q = "e"] = [undefined, null] as any;
console.log(p, q);
})();

// ===== 吸收 tests/cases/runtime/round737/p737a-a14.ts · 迭代协议不认时抛 `TypeError`（而不是静默给空） =====
await (async () => {
for (const bad of [1, {}, null, undefined]) {
  try { for (const _ of bad as any) { console.log("never"); } console.log("no-throw"); }
  catch (e: any) { console.log("throw", e.constructor.name); }
}
try { [...(1 as any)]; } catch (e: any) { console.log("spread", e.constructor.name); }
})();
}
main();
