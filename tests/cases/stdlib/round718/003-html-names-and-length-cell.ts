// xl:title 名字表与 `length` 那一格：十三个名字都是函数、`String.prototype.length` 是 `0`
// xl:round 718
// xl:judge stdout
// xl:end
// **第 794 轮（三）把同判定点的 3 条原子探针并了进来**（正文一字未改，只裹进带标签的 IIFE）。
// 判定点只有一个：**这一族在原型上是怎么登记的**（名字在不在、可不可枚举、`length` 那一格）。
try { (function () { // probe: p718a-h09 十三个名字在原型上都是函数
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const names = ["anchor", "big", "blink", "bold", "fixed", "fontcolor", "fontsize",
  "italics", "link", "small", "strike", "sub", "sup"];
console.log(names.map((k) => typeof (String.prototype as any)[k]).join(","));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p718a-h12 `String.prototype.length` 是 `0`，且三个标志全假
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => typeof (String.prototype as any).length + ":" + (String.prototype as any).length));
console.log(t(() => JSON.stringify(Object.getOwnPropertyDescriptor(String.prototype, "length"))));
console.log(t(() => Object.keys(String.prototype).length));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p718a-h14 这一族**不**进 `Object.keys`（挂在原型上的成员都是隐藏的）
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => Object.keys(String.prototype).length));
console.log(t(() => JSON.stringify(Object.keys(String.prototype))));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
