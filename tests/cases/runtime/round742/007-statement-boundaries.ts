// xl:title 语句边界：悬垂 `else`、空语句、空循环体
// xl:round 742
// xl:judge stdout
// xl:end
// **第 794 轮把同判定点的 2 条原子探针并了进来**（正文一字未改，只裹进带标签的 IIFE）。
// 判定点只有一个：**`else` 归谁、`;` 算不算一条语句**。
try { (function () { // probe: p742c-c13 悬垂 `else` 归属最近的那个 `if`
function f(a: boolean, b: boolean): string {
  if (a) if (b) return "ab"; else return "a!b";
  return "!a";
}
console.log(f(true, true), f(true, false), f(false, true));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p742c-c14 空语句：`if (x) ;` / `for (...) ;` / `while (false) ;`
let n = 0;
if (true) ; else n = 1;
for (let i = 0; i < 2; i++) ;
while (false) ;
console.log(n);
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
