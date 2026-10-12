// xl:title `await` 的操作数形状：字面量 / 下标 / 实参与返回值 / 承诺套承诺，以及两段以上的复合表达式
// xl:round 739
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round739 里同判定点的
// 4 条原子探针并成这一条：p739a-a12 · p739a-a07 · p739a-a15 · p739a-a08
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round739/p739a-a12.ts · `await` 后面是数组 / 字符串 / 数字字面量 =====
await (async () => {
async function main() {
  console.log(await "1" + 1);
  console.log(await 1 + "1");
  console.log(await [1, 2] + "");
  console.log(await { a: 1 } + "");
}
await main();
})();

// ===== 吸收 tests/cases/runtime/round739/p739a-a07.ts · 左操作数是下标时 =====
await (async () => {
const arr = [Promise.resolve(1)];
async function main() {
  console.log(await arr[0] + 1);
  const m: any = { k: Promise.resolve(2) };
  console.log(await m.k * 2);
}
await main();
})();

// ===== 吸收 tests/cases/runtime/round739/p739a-a15.ts · `await` 嵌套在实参 / 返回值 / 承诺套承诺里 =====
await (async () => {
const id = (v: any) => v;
async function f(x: any) { return await x + 1; }
async function main() {
  console.log(id(await Promise.resolve(1) + 1));
  console.log(await f(Promise.resolve(1)));
  console.log(await Promise.resolve(Promise.resolve(1)) + 1);
}
await main();
})();

// ===== 吸收 tests/cases/runtime/round739/p739a-a08.ts · 两侧都是 `await` / 三段算术 =====
await (async () => {
async function main() {
  console.log(await Promise.resolve(1) + await Promise.resolve(2));
  console.log(await Promise.resolve(1) + 1 + 1);
  console.log(1 + await Promise.resolve(1));
  console.log("a" + await Promise.resolve("b"));
}
await main();
})();
}
main();
