// xl:title 循环与标签：`for(;;)` / 双 `for` 的 `break lbl` / `do...while` 的 `continue lbl` / `while` 条件副作用
// xl:round 742
// xl:judge stdout
// xl:end
// **第 794 轮把同判定点的 5 条原子探针并了进来**（正文一字未改，只裹进带标签的 IIFE）。
// 判定点只有一个：**带标签的跳转落在哪一层、循环条件求值几次**。
try { (function () { // probe: p742c-c12 无头 `for (;;)` 与带标签的双层 `break`
let n = 0;
outer: for (;;) {
  for (let j = 0; j < 3; j++) {
    n++;
    if (n === 4) break outer;
  }
}
console.log(n);
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p742c-c19 `do...while` 里的带标签 `continue`
const out: number[] = [];
let i = 0;
outer: do {
  i++;
  if (i === 2) continue outer;
  out.push(i);
} while (i < 4);
console.log(out.join(","), i);
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p742c-c20 `while` 条件里的副作用每轮算一次
let i = 0;
const out: number[] = [];
while (i++ < 3) out.push(i);
console.log(out.join(","), i);
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p742c-c21 `for...in` 与 `for...of` 的 `continue` / `break`
const o: any = { a: 1, b: 2, c: 3 };
const ks: string[] = [];
for (const k in o) { if (k === "b") continue; ks.push(k); }
const vs: number[] = [];
for (const v of [10, 20, 30]) { if (v === 20) break; vs.push(v); }
console.log(ks.join(","), vs.join(","));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p742c-c15 带标签的块与 `break blk`
function f(x: number): string {
  let out = "";
  blk: { out += "a"; if (x) break blk; out += "b"; }
  out += "c";
  return out;
}
console.log(f(0), f(1));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
