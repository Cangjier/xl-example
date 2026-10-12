// xl:title `Map` / `Set` 的构造与相等：`NaN` / `-0` / 对象身份 / 非法实参
// xl:round 752
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round752 里同判定点的
// 1 条原子探针并成这一条：p752a-04
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round752/p752a-04.ts · `Map` / `Set` 的构造与相等：`NaN` / `-0` / 对象身份 / 非法实参 =====
await (async () => {
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('new Map([[NaN, 1]]).get(', show(() => new Map([[NaN, 1]]).get(NaN)));
console.log('new Map([[0, 1]]).get(-0', show(() => new Map([[0, 1]]).get(-0)));
console.log('new Set([NaN, NaN]).size', show(() => new Set([NaN, NaN]).size));
console.log('new Set([-0, 0]).size', show(() => new Set([-0, 0]).size));
console.log('new Map([[{}, 1]]).size', show(() => new Map([[{}, 1]]).size));
console.log('new Map(1 as any)', show(() => new Map(1 as any)));
})();
}
main();
