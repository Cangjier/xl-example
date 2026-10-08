// xl:title 可选捕获绑定、try-finally、带类型的 catch
// xl:round 371
// xl:judge stdout
// xl:end
function risky(fail: boolean): string {
  try {
    if (fail) throw new TypeError("bad");
    return "ok";
  } catch {
    return "caught";
  } finally {
    console.log("fin", fail);
  }
}
function onlyFinally(): number { try { return 1; } finally { console.log("f2"); } }
console.log(risky(false), risky(true), onlyFinally());
try { throw new Error("e"); } catch (err: unknown) { console.log((err as Error).message); }
