// xl:title 循环里 try/finally 夹着 continue 与 break：finally 照跑
// xl:judge stdout
// xl:end
// **第 794 轮把同判定点的两条并了进来**（探针正文一字未改，只裹进 `show` 小壳）：
//   · probe694-x05（`if (i === 1) continue;` 那条路）
//   · probe694-x06（`if (i === 1) break;` 那条路）
// 判定点只有一个：**离开循环的那几条路（continue / break）上 finally 跑不跑**。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
const out: number[] = [];
for (let i = 0; i < 5; i++) {
  try {
    if (i % 2) continue;
    out.push(i);
  } finally {
    out.push(100 + i);
  }
}
console.log(out.join(","));
try { console.log("continue:", show((function () { let s = ""; for (let i = 0; i < 3; i++) { try { if (i === 1) continue; s += i; } finally { s += "f"; } } return s; })())); }
catch (e: any) { console.log("continue:", show("throw:" + (e && e.constructor ? e.constructor.name : "?"))); }
try { console.log("break:", show((function () { let s = ""; for (let i = 0; i < 3; i++) { try { if (i === 1) break; s += i; } finally { s += "f"; } } return s; })())); }
catch (e: any) { console.log("break:", show("throw:" + (e && e.constructor ? e.constructor.name : "?"))); }
