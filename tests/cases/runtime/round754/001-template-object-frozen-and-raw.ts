// xl:title 标签模板对象：冻结、`raw` 的描述符、每次求值新建
// xl:round 754
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round754 里同判定点的
// 1 条原子探针并成这一条：p754b-01
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round754/p754b-01.ts · 标签模板对象：冻结、`raw` 的描述符、每次求值新建 =====
await (async () => {
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('(function () { const tag = (s:', show(() => (function () { const tag = (s: any) => Object.isFrozen(s); return tag`x`; })()));
console.log('(function () { const tag = (s:', show(() => (function () { const tag = (s: any) => Object.isFrozen(s.raw); return tag`x`; })()));
console.log('(function () { const tag = (s:', show(() => (function () { const tag = (s: any) => JSON.stringify(Object.getOwnPropertyDescriptor(s, "raw")); return tag`x`; })()));
console.log('(function () { const tag = (s:', show(() => (function () { const tag = (s: any) => Object.keys(s).join(","); return tag`x`; })()));
console.log('(function () { const tag = (s:', show(() => (function () { const tag = (s: any) => s.raw.length; return tag`a${1}b`; })()));
console.log('(function () { const tag = (s:', show(() => (function () { const tag = (s: any) => s.length; return tag`a${1}b`; })()));
console.log('(function () { const tag = (s:', show(() => (function () { const tag = (s: any) => s.raw[0]; return tag`a\nb`; })()));
console.log('(function () { const tag = (s:', show(() => (function () { const tag = (s: any) => s[0]; return tag`a\nb`; })()));
console.log('(function () { const tag = (s:', show(() => (function () { const tag = (s: any) => Array.isArray(s) && Array.isArray(s.raw); return tag`x`; })()));
console.log('(function () { const tag = (s:', show(() => (function () { const tag = (s: any) => Object.getPrototypeOf(s) === Array.prototype; return tag`x`; })()));
console.log('(function () { const tag = (s:', show(() => (function () { const tag = (s: any) => { try { s.push(9); return "pushed"; } catch (e) { return (e as Error).constructor.name; } }; return tag`x`; })()));
console.log('(function () { const tag = (s:', show(() => (function () { const tag = (s: any) => { try { s.raw = 1; return "wrote"; } catch (e) { return (e as Error).constructor.name; } }; return tag`x`; })()));
})();
}
main();
