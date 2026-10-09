// xl:title `try` / `finally` / `throw` 的收口：`finally` 里的 `return`、嵌套顺序、抛非 Error
// xl:round 742
// xl:judge stdout
// xl:end
// **第 794 轮把同判定点的 3 条原子探针并了进来**（正文一字未改，只裹进带标签的 IIFE）。
// 判定点只有一个：**`try` / `catch` / `finally` 三者谁的话算数**（与 `runtime/exceptions`
// 那个域的分工：那边量的是异常对象的形状与传播，这边量的是**控制流的收口**）。
try { (function () { // probe: p742c-c16 `finally` 里的 `return` 覆盖 `try` 里的
function f(): string {
  try { return "try"; } finally { return "finally"; }
}
console.log(f());
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p742c-c17 嵌套 `try` 的 `finally` 顺序与 `catch` 里的 `return`
const log: string[] = [];
function f(): string {
  try {
    try { throw new Error("x"); } finally { log.push("inner"); }
  } catch (e: any) { log.push("catch"); return "c"; } finally { log.push("outer"); }
}
console.log(f(), log.join(","));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p742c-c18 `throw` 一个非 Error 值再 `catch` 出来
function f(x: number): string {
  try { if (x) throw { code: 7 }; return "no"; }
  catch (e: any) { return "code=" + e.code; }
}
console.log(f(1), f(0));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
