// xl:title 回调里抛：`forEach` / `map` / `sort` / `Map.forEach` 都**立刻**中断，外层 `catch` 接得住
// xl:judge stdout
// xl:end

let log = "";
try { [1, 2, 3].forEach((v: number) => { if (v === 2) throw new Error("each" + v); log += v; }); }
catch (e: any) { log += "|each:" + e.message; }
try { [1, 2, 3].map((v: number) => { if (v === 2) throw new Error("map" + v); log += v; return v; }); }
catch (e: any) { log += "|map:" + e.message; }
try { [3, 1, 2].sort((a: number, b: number) => { if (b === 2) throw new Error("sort"); return a - b; }); }
catch (e: any) { log += "|sort"; }
const m = new Map<string, number>([["a", 1], ["b", 2]]);
try { m.forEach((v: number, k: string) => { if (k === "b") throw new Error("m" + k); log += k; }); }
catch (e: any) { log += "|mapfor:" + e.message; }
console.log(log);
console.log("after", [1, 2].map((v: number) => v * 2).join(","));
