// xl:title HTML 包装族：十三个方法各自那一句、缺实参、转义与 ToString
// xl:round 718
// xl:judge stdout
// xl:end
// **第 794 轮（三）把同判定点的 7 条原子探针并了进来**（每条正文**一字未改**，
// 连它自己的 `show` / `t` 辅助都照抄，只裹进带标签的 IIFE；探针名见每段前的注释）。
// 判定点只有一个：**`anchor` / `big` / … / `sup` 这十三个方法吐出的是哪一句 HTML**。
try { (function () { // probe: p718a-h01 十三个 HTML 包装各自的那一句
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => "a".anchor("n")));
console.log(t(() => "a".big()));
console.log(t(() => "a".blink()));
console.log(t(() => "a".bold()));
console.log(t(() => "a".fixed()));
console.log(t(() => "a".fontcolor("red")));
console.log(t(() => "a".fontsize(4)));
console.log(t(() => "a".italics()));
console.log(t(() => "a".link("u")));
console.log(t(() => "a".small()));
console.log(t(() => "a".strike()));
console.log(t(() => "a".sub()));
console.log(t(() => "a".sup()));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p718a-h02 属性值缺实参是 `undefined`（不是空串）
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => "a".anchor()));
console.log(t(() => "a".link()));
console.log(t(() => "a".fontcolor()));
console.log(t(() => "a".fontsize()));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p718a-h03 属性值只转义 `"`，`&` / `<` / `>` 原样
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => "a".link("x\"y")));
console.log(t(() => "a".anchor("a&b<c>d")));
console.log(t(() => "a".fontcolor("\"\"\"")));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p718a-h04 属性值走 ToString：数值 / 对象 / 布尔 / null
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => (1).anchor("n")));
console.log(t(() => "a".fontsize({ toString() { return 7; } })));
console.log(t(() => "a".fontcolor(true)));
console.log(t(() => "a".anchor(null)));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p718a-h15 `anchor` / `link` 的标签都是 `a`，属性不同
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => "s".anchor("n").slice(0, 9)));
console.log(t(() => "s".link("u").slice(0, 9)));
console.log(t(() => "s".fontcolor("c").slice(0, 11) + "|" + "s".fontsize(3).slice(0, 10)));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
