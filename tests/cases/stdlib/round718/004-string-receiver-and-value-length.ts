// xl:title 接收者与值走的是**同一条** ToString：字符串值的 `length` 与包装出来的串
// xl:round 718
// xl:judge stdout
// xl:end
// **第 794 轮（三）把同判定点的 2 条原子探针并了进来**（正文一字未改，只裹进带标签的 IIFE）。
// 判定点只有一个：**字符串值自己的 `length` 与包装出来的串的关系**。
try { (function () { // probe: p718a-h13 `String.prototype.length` 与字符串**值**的 `length` 不是同一条路
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => "abc".length + "|" + "".length + "|" + ("abc" as any).length));
console.log(t(() => "abc".bold().length));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p718b-r09 同一句 `ToString`：接收者与实参给同一个答案
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const box = { toString() { return "b"; } };
console.log(t(() => String.prototype.includes.call({ toString() { return "abc"; } }, box)));
console.log(t(() => "abc".includes(box)));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
