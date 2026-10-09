// xl:title `default` 的三格：只有它、写在中间、写在前头
// xl:round 742
// xl:judge stdout
// xl:end
// **第 794 轮把同判定点的 3 条原子探针并了进来**（正文一字未改，只裹进带标签的 IIFE）。
// 判定点只有一个：**`default` 的位置与「匹配不到时谁接走」**。
try { (function () { // probe: p742c-c01 只有 `default` 的 `switch`
function f(x: number): string {
  switch (x) { default: return "d"; }
}
console.log(f(0), f(1));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p742a-a07 没有 `default` 又没有匹配：整段跳过
function f(x: number): string {
  let out = "none";
  switch (x) {
    case 1: out = "one"; break;
    case 2: out = "two";
  }
  return out;
}
console.log(f(1), f(2), f(3));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p742a-a02 `default` 在中间：它仍然最后才匹配、匹配到了就往下落
function f(x: string): string {
  let out = "";
  switch (x) {
    case "a": out += "A";
    default: out += "D";
    case "b": out += "B";
  }
  return out;
}
console.log(f("a"), f("b"), f("z"));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p742c-c02 `default` 写在前头、匹配后往下降进后面的 `case`
function f(x: number): string {
  let out = "";
  switch (x) {
    default: out += "D";
    case 1: out += "1"; break;
    case 2: out += "2";
  }
  return out;
}
console.log(f(1), f(2), f(3));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
