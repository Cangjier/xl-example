// xl:title `switch` 的匹配口径：严格相等、表达式求值一次、走不到的 case 不求值
// xl:round 742
// xl:judge stdout
// xl:end
// **第 794 轮把同判定点的 8 条原子探针并了进来**（每条正文**一字未改**，连它自己的
// `console.log` 都照抄，只裹进带标签的 IIFE；探针名见每段前的 `// probe:` 注释）。
// **第 809 轮把 `exec/round742/001-switch-match-evaluation` 并了进来**（同一个判定点在
// 另一个类别里又写了一遍——`exec` 那一份少三段，逐句搬进下面那两个块里；那份从盘上删掉）。
// 判定点只有一个：**判别式与 case 表达式怎么比**。
try { (function () { // probe: p742a-a05 `switch` 比的是严格相等：1 对 "1"、NaN、-0
function f(x: any): string {
  switch (x) {
    case 1: return "num";
    case "1": return "str";
    case NaN: return "nan";
    case 0: return "zero";
    default: return "none";
  }
}
console.log(f(1), f("1"), f(NaN), f(0), f(-0), f(true));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p742a-a06 `-0` 与 `0` 是同一格：第一个 `case -0` 把两个都接走
function f(x: number): string {
  switch (x) {
    case -0: return "negzero";
    case 0: return "zero";
  }
  return "none";
}
console.log(f(0), f(-0), f(1));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p742a-a04 判别式求值一次、`case` 表达式从上往下求值
let n = 0;
const d = () => { n += 1; return 2; };
const c = (v: number) => { n += 10; return v; };
switch (d()) {
  case c(1): console.log("c1"); break;
  case c(2): console.log("c2"); break;
  default: console.log("no");
}
console.log(n);
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p742c-c03 匹配上之后，后面的 `case` 表达式不再求值
const log: string[] = [];
const t = (s: string) => { log.push(s); return s; };
switch (t("d")) {
  case t("d"): log.push("hit"); break;
  case t("e"): log.push("E"); break;
}
console.log(log.join(","));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // 809 · 判别式是**自增表达式**：只求值一次（原 exec/round742/001 b02）
let i809 = 0;
switch (i809++) {
  case 0: console.log("zero", i809); break;
  default: console.log("d", i809);
}
console.log(i809);
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // 809 · 判别式可以是 `typeof` 这类表达式（原 exec/round742/001 b07）
function f(x: any): string {
  switch (typeof x) {
    case "number": return "number";
    case "string": return "string";
    case "object": return x === null ? "null" : "object";
    default: return "other";
  }
}
console.log(f(1), f("s"), f(null), f([]), f(true), f(undefined));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // 809 · 落空：`"1"` 与 `NaN` 都不匹配 `1`（原 exec/round742/001 736-c12 前半）
function pick(v: any) {
  switch (v) {
    case 1: return "one";
    case "1": return "str-one";
    case NaN: return "nan";
    default: return "other";
  }
}
console.log(pick(1), pick("1"), pick(NaN), pick(2));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p742c-c04 走不到的 `case` 表达式即使会抛也不抛
function f(x: number): string {
  switch (x) {
    case 1: return "one";
    case (() => { throw new Error("boom"); })(): return "never";
  }
  return "rest";
}
console.log(f(1));
try { console.log(f(2)); } catch (e: any) { console.log("caught", e.message); }
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p742a-a10 `switch (true)` 那种写法：`case` 是布尔表达式
function f(x: number): string {
  switch (true) {
    case x < 0: return "neg";
    case x === 0: return "zero";
    default: return "pos";
  }
}
console.log(f(-1), f(0), f(1));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p742a-a14 判别式是方法调用的结果与模板串
const o: any = { toString() { return "k"; } };
switch (String(o)) {
  case "k": console.log("K"); break;
  default: console.log("D");
}
function f(x: string): number {
  switch (`${x}!`) {
    case "a!": return 1;
    case "b!": return 2;
  }
  return 0;
}
console.log(f("a"), f("b"), f("c"));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p742c-c07 `undefined` 与 `case void 0` / `case null`
function f(x: any): string {
  switch (x) {
    case void 0: return "undef";
    case null: return "null";
    default: return "other";
  }
}
console.log(f(undefined), f(null), f(0));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p742c-c10 `case` 的引用相等：数组与对象字面量各是新的一个
const arr = [1];
const o = { a: 1 };
function f(x: any): string {
  switch (x) {
    case arr: return "arr";
    case o: return "obj";
    default: return "none";
  }
}
console.log(f(arr), f([1]), f(o), f({ a: 1 }));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
