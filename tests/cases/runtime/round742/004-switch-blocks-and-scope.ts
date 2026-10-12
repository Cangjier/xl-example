// xl:title `case` 里的块与作用域：`let` / `const`、闭包捕获、`var` 提升、标签与嵌套
// xl:round 742
// xl:judge stdout
// xl:end
// **第 794 轮把同判定点的 8 条原子探针并了进来**（正文一字未改，只裹进带标签的 IIFE）。
// 判定点只有一个：**`case` 那一格的块作用域怎么划、`break` 出的是哪一个 `switch`**。
try { (function () { // probe: p742a-a03 `case` 后面带块：块里的 `let` / `const` 各归各的
function f(x: number): string {
  switch (x) {
    case 1: { const v = "one"; return v; }
    case 2: { let v = "two"; v += "!"; return v; }
    case 3: { let v = "three"; return v; }
    default: return "other";
  }
}
console.log(f(1), f(2), f(3), f(4));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p742c-c08 闭包捕获 `case` 块里的 `let`
function f(): string {
  const fs: (() => string)[] = [];
  switch (1) {
    case 1: { let v = "v1"; fs.push(() => v); break; }
    default: { let v = "vd"; fs.push(() => v); }
  }
  return fs.map((g) => g()).join(",");
}
console.log(f());
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p742a-a13 `switch` 里的 `var` 提升到函数作用域
function f(x: number): string {
  switch (x) {
    case 1: var v = "one"; break;
    default: v = "def";
  }
  return String(v);
}
console.log(f(1), f(2));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p742c-c05 带标签的 `switch` 与 `break lbl`
function f(x: number): string {
  let out = "";
  lbl: switch (x) {
    case 1: out += "1"; break lbl;
    default: out += "d";
  }
  out += "!";
  return out;
}
console.log(f(1), f(2));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p742c-c06 `case` 里的块：块内 `break` 出的是 `switch`
function f(x: number): string {
  let out = "";
  switch (x) {
    case 1: { out += "a"; break; }
    default: out += "d";
  }
  out += "z";
  return out;
}
console.log(f(1), f(2));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p742a-a12 嵌套 `switch`：内层的 `break` 不跑到外层去
const out: string[] = [];
switch (1) {
  case 1:
    switch (2) {
      case 2: out.push("inner"); break;
      case 3: out.push("inner3");
    }
    out.push("outer");
    break;
  default: out.push("def");
}
console.log(out.join(","));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p742a-a08 `switch` 在循环里：`break` 只出 `switch`、`continue` 出循环
const out: string[] = [];
for (let i = 0; i < 4; i++) {
  switch (i) {
    case 0: out.push("zero"); break;
    case 1: continue;
    case 2: out.push("two");
    default: out.push("d" + i);
  }
  out.push("after" + i);
}
console.log(out.join(","));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
