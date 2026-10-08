// xl:title 错误的捕获、分类、重抛与 finally 的清理
// xl:round 371
// xl:judge stdout
// xl:end
function parseNumber(text: string): number {
  const n = Number(text);
  if (Number.isNaN(n)) throw new TypeError("not a number: " + text);
  if (!Number.isFinite(n)) throw new RangeError("not finite: " + text);
  return n;
}
for (const t of ["1", "x", "Infinity"]) {
  try { console.log("ok", parseNumber(t)); }
  catch (e) {
    const err = e as Error;
    console.log(err instanceof TypeError ? "T" : err instanceof RangeError ? "R" : "?", err.message);
  }
}
const cleanups: string[] = [];
function work(fail: boolean): string {
  try { if (fail) throw new Error("w"); return "done"; }
  catch (e) { cleanups.push("catch"); throw e; }
  finally { cleanups.push("finally"); }
}
try { work(true); } catch (e) { cleanups.push("outer"); }
console.log(cleanups.join(","), work(false));
