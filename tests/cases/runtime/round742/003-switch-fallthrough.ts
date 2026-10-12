// xl:title fallthrough 的落法：三种缺 `break` 的写法、空 `case`、带条件的块
// xl:round 742
// xl:judge stdout
// xl:end
// **第 794 轮把同判定点的 3 条原子探针并了进来**（每条正文**一字未改**，
// 连它自己的 `console.log` 都照抄，只裹进带标签的 IIFE）。
// 判定点只有一个：**不写 `break` 时那一趟往哪儿落、什么时候停**。
try { (function () { // probe: p742a-a01 `switch` 的 fallthrough：`break` 缺一格的三种落法
function f(x: number): string {
  let out = "";
  switch (x) {
    case 1: out += "one";
    case 2: out += "two"; break;
    case 3: out += "three";
    default: out += "d";
  }
  return out;
}
console.log(f(1), f(2), f(3), f(4), f(5));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p742a-a11 空 `case` 合并与空 `switch`
function f(x: number): string {
  switch (x) {
    case 1:
    case 2: return "1or2";
    case 3:
    default: return "other";
  }
}
console.log(f(1), f(2), f(3), f(4));
let hit = 0;
switch (9) { }
console.log(hit);
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p742c-c09 fallthrough 落进带条件的块
function f(x: number): string {
  let out = "";
  switch (x) {
    case 1: out += "1";
    case 2: { out += "2"; if (x === 1) break; }
    case 3: out += "3"; break;
  }
  return out;
}
console.log(f(1), f(2), f(3), f(4));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
