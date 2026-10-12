// xl:title catch 里 throw，finally 照跑，外层接住；catch 里再抛同一个对象
// xl:judge stdout
// xl:end
// **第 794 轮把同判定点的一条并了进来**：probe694-x21（catch 里 `throw e`，
// 内层 catch 再接一次，拿到的还是同一个对象）。判定点只有一个：
// **catch 里抛出去的那一抛走哪条路、finally 还跑不跑**。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
function risky(): string {
  try {
    try { throw new Error("a"); }
    catch (e: any) { throw new Error("b:" + e.message); }
    finally { console.log("inner-finally"); }
  } catch (e: any) { return "outer:" + e.message; }
}
console.log(risky());
try { console.log("rethrow-same:", show((function () { try { throw new Error("a"); } catch (e) { try { throw e; } catch (f) { return f.message; } } })())); }
catch (e: any) { console.log("rethrow-same:", show("throw:" + (e && e.constructor ? e.constructor.name : "?"))); }
