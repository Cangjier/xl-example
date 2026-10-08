// xl:title catch 里 throw，finally 照跑，外层接住
// xl:judge stdout
// xl:end

function risky(): string {
  try {
    try { throw new Error("a"); }
    catch (e: any) { throw new Error("b:" + e.message); }
    finally { console.log("inner-finally"); }
  } catch (e: any) { return "outer:" + e.message; }
}
console.log(risky());
