// xl:title String.prototype 的接收者：ToString 收谁、`null` / `undefined` / 符号抛
// xl:round 718
// xl:judge stdout
// xl:end
// **第 794 轮（三）把同判定点的 13 条原子探针并了进来**（每条正文**一字未改**，
// 连它自己的 `show` / `t` 辅助都照抄，只裹进带标签的 IIFE；探针名见每段前的注释）。
// 判定点只有一个：**`String.prototype` 上的方法拿到各种接收者时按哪条路走**。
try { (function () { // probe: p718b-r01 数值接收者：整个 String.prototype 都按 ToString 收
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => String.prototype.toUpperCase.call(12)));
console.log(t(() => String.prototype.slice.call(12345, 1, 3)));
console.log(t(() => String.prototype.repeat.call(7, 3)));
console.log(t(() => String.prototype.padStart.call(5, 3, "0")));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p718b-r02 布尔 / 浮点 / `-0` 接收者
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => String.prototype.toUpperCase.call(true)));
console.log(t(() => String.prototype.charAt.call(false, 1)));
console.log(t(() => String.prototype.indexOf.call(1.5, ".")));
console.log(t(() => String.prototype.bold.call(-0)));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p718b-r03 对象接收者走自己的 `toString`
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => String.prototype.toUpperCase.call({ toString() { return "ab"; } })));
console.log(t(() => String.prototype.length === undefined ? "x" : String.prototype.slice.call({ toString() { return "abcd"; } }, 1)));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p718b-r04 `null` / `undefined` 接收者抛 `TypeError`
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => String.prototype.trim.call(null)));
console.log(t(() => String.prototype.trim.call(undefined)));
console.log(t(() => String.prototype.split.call(null, ",")));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p718b-r05 符号接收者抛 `TypeError`（`ToString` 不收符号）
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => String.prototype.trim.call(Symbol("s"))));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p718b-r06 `split` 那条独立的路同样收非字符串接收者
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => String.prototype.split.call(1234, "2")));
console.log(t(() => String.prototype.split.call(true, "r")));
console.log(t(() => String.prototype.split.call({ toString() { return "a-b"; } }, "-")));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p718b-r07 包装对象仍然是脱箱那一档（不是 `ToString` 的 `[object String]`）
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => String.prototype.toUpperCase.call(new String("ab"))));
console.log(t(() => String.prototype.bold.call(new String("ab"))));
console.log(t(() => new String("ab").split("")));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p718b-r08 函数接收者：JS 拿源码文本
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

function named() { return 1; }
console.log(t(() => String.prototype.toUpperCase.call(named).length > 0));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p718b-r10 接收者这一步**不**改字符：`charCodeAt` / `codePointAt` / `normalize`
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => String.prototype.charCodeAt.call(65, 0)));
console.log(t(() => String.prototype.codePointAt.call(65, 0)));
console.log(t(() => String.prototype.normalize.call(123)));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p718a-h05 接收者那一半：空串 / 非 ASCII / 包装对象
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => "".bold()));
console.log(t(() => "中文".bold()));
console.log(t(() => new String("ab").bold()));
console.log(t(() => String.prototype.bold.call(12)));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p718a-h06 接收者不可强转时抛（null / undefined）
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => (String.prototype as any).bold.call(null)));
console.log(t(() => (String.prototype as any).bold.call(undefined)));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p718a-h07 包装出来的串还能再接一层
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => "a".bold().link("u")));
console.log(t(() => "a".bold().length));
console.log(t(() => "a".big().big()));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p718a-h08 落单的代理码元原样带着走（不被换成 U+FFFD）
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => "\ud800".bold().length));
console.log(t(() => "\ud83d\ude00".bold().length));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
