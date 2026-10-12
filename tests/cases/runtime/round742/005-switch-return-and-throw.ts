// xl:title `switch` 里的出口：`return` 与 `throw` 穿过它
// xl:round 742
// xl:judge stdout
// xl:end
// **第 794 轮把第一条原子探针并了进来**（正文一字未改，只裹进带标签的 IIFE）。
// 判定点只有一个：**`return` / `throw` 在 `switch` 里怎么收口**。
try { (function () { // probe: p742a-a09 `switch` 里的 `return` 与 `throw`
function f(x: number): string {
  switch (x) {
    case 1: return "one";
    case 2: throw new Error("two");
  }
  return "rest";
}
console.log(f(1));
try { f(2); } catch (e: any) { console.log("caught", e.message); }
console.log(f(3));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
