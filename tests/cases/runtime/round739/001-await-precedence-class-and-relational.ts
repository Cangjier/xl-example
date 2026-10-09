// xl:title `await` 与算术 / 相等 / 关系运算符的紧密度（含 `await` 在条件位与三元条件里）
// xl:round 739
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round739 里同判定点的
// 3 条原子探针并成这一条：p739a-a01 · p739a-a03 · p739a-a04
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round739/p739a-a01.ts · `await` 与算术运算符的紧密度 =====
await (async () => {
async function main() {
  console.log(await Promise.resolve(1) + 1);
  console.log(await Promise.resolve(2) * 3);
  console.log(await Promise.resolve(10) - 1);
  console.log(await Promise.resolve(1) + 2 * 3);
  console.log(await Promise.resolve(2) * 3 + 1);
}
await main();
})();

// ===== 吸收 tests/cases/runtime/round739/p739a-a03.ts · `await` 与相等 / 关系运算符 =====
await (async () => {
async function f(x: any) { return await x === 1; }
async function g(x: any) { return await x > 0 ? "pos" : "neg"; }
async function main() {
  console.log(await f(Promise.resolve(1)), await f(Promise.resolve(2)));
  console.log(await g(Promise.resolve(1)), await g(Promise.resolve(-1)));
  console.log(await Promise.resolve(3) == "3");
}
await main();
})();

// ===== 吸收 tests/cases/runtime/round739/p739a-a04.ts · `await` 在条件位与三元条件里 =====
await (async () => {
async function main() {
  if (await Promise.resolve(1) > 0) console.log("pos");
  const v = await Promise.resolve(0) ? "T" : "F";
  console.log(v);
  console.log(await Promise.resolve("") || "empty");
}
await main();
})();
}
main();
