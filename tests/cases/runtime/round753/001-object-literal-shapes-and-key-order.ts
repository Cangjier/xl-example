// xl:title 对象字面量：简写、计算键、方法、访问器、`__proto__`、展开与键的次序
// xl:round 753
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round753 里同判定点的
// 1 条原子探针并成这一条：p753a-01
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round753/p753a-01.ts · 对象字面量：简写、计算键、方法、访问器、`__proto__`、展开 =====
await (async () => {
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('({ a: 1, b: 2 })', show(() => ({ a: 1, b: 2 })));
console.log('(function () { const a = 1; re', show(() => (function () { const a = 1; return { a }; })()));
console.log('({ ["k" + 1]: 1 })', show(() => ({ ["k" + 1]: 1 })));
console.log('({ m() { return 1; } }).m()', show(() => ({ m() { return 1; } }).m()));
console.log('({ get g() { return 1; } }).g', show(() => ({ get g() { return 1; } }).g));
console.log('({ __proto__: { z: 1 } }).z', show(() => ({ __proto__: { z: 1 } }).z));
console.log('Object.getPrototypeOf({ __prot', show(() => Object.getPrototypeOf({ __proto__: { z: 1 } })));
console.log('({ ["__proto__"]: { z: 1 } }).', show(() => ({ ["__proto__"]: { z: 1 } }).z));
console.log('({ ...{ a: 1 }, b: 2 })', show(() => ({ ...{ a: 1 }, b: 2 })));
console.log('Object.keys({ 2: "a", 1: "b", ', show(() => Object.keys({ 2: "a", 1: "b", x: "c" })));
console.log('Object.getOwnPropertyNames({ b', show(() => Object.getOwnPropertyNames({ b: 1, a: 2 })));
console.log('JSON.stringify({ m() { return ', show(() => JSON.stringify({ m() { return 1; } })));
})();
}
main();
