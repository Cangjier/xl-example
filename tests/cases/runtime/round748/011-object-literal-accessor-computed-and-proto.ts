// xl:title 对象字面量：访问器与数据成员同名、计算键、整数键、`__proto__` 与展开
// xl:round 748
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round748 里同判定点的
// 1 条原子探针并成这一条：p748a-a12
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round748/p748a-a12.ts · 对象字面量：访问器与数据成员同名、计算键、`__proto__` =====
await (async () => {
const o: any = {
  get a() { return "get"; },
  set a(v) { console.log("set", v); },
  b: 2,
  ["c" + 1]: 3,
  "d": 4,
  1: "one",
};
console.log(o.a, o.b, o.c1, o.d, o[1]);
o.a = 9;
console.log(Object.keys(o).join(","));
console.log(JSON.stringify({ ...o, a: 7 }));
const shorthand = { x: 1 };
console.log(JSON.stringify({ shorthand }));
})();
}
main();
