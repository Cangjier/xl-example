// xl:title 抛原始值、抛对象、rethrow 与 finally 里的抛
// xl:round 371
// xl:judge stdout
// xl:end
// **第 794 轮把同判定点的两条并了进来**（正文一字未改）：
//   · 024（`f(kind)` 抛 "boom" / 42，循环里逐档接住）
//   · 034（`throw { code: 42 }` 穿过帧到达 catch；`throw e + '!'` 的 rethrow）
// 判定点只有一个：**非 Error 的值从抛到接的整条路**。
for (const v of ["s", 1, null, undefined, { code: 1 }, [1, 2]]) {
  try { throw v; } catch (e) { console.log(typeof e, JSON.stringify(e)); }
}
try {
  try { throw new Error("orig"); } catch (e) { throw new Error("wrapped: " + (e as Error).message); }
} catch (e) { console.log((e as Error).message); }
try {
  try { throw new Error("a"); } finally { throw new Error("b"); }
} catch (e) { console.log("winner", (e as Error).message); }
function f(kind: string) {
  if (kind === "s") throw "boom";
  if (kind === "n") throw 42;
  return "ok";
}
for (const k of ["s", "n", "x"]) {
  try { console.log(k, f(k)); } catch (e) { console.log(k, "caught", e); }
}
function t() { throw { code: 42 }; }
try { (t as any)(); } catch (e: any) { console.log('caught', e.code); }
try { console.log("rethrow", String((() => { try { try { throw 's'; } catch (e) { throw e + '!'; } } catch (e) { return String(e); } })())); } catch (e) { console.log("rethrow", "ERR", String(e && e.name)); }
