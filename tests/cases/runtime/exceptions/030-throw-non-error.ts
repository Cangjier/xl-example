// xl:title 抛原始值、抛对象、rethrow 与 finally 里的抛
// xl:round 371
// xl:judge stdout
// xl:end
for (const v of ["s", 1, null, undefined, { code: 1 }, [1, 2]]) {
  try { throw v; } catch (e) { console.log(typeof e, JSON.stringify(e)); }
}
try {
  try { throw new Error("orig"); } catch (e) { throw new Error("wrapped: " + (e as Error).message); }
} catch (e) { console.log((e as Error).message); }
try {
  try { throw new Error("a"); } finally { throw new Error("b"); }
} catch (e) { console.log("winner", (e as Error).message); }
