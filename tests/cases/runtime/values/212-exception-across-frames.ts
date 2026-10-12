// xl:title 异常跨多层函数帧展开并回到调用者
// xl:round 371
// xl:judge stdout
// xl:end
function level3(): never { throw new Error("deep"); }
function level2(): string { try { return level3(); } catch (e) { throw new Error("wrapped(" + (e as Error).message + ")"); } }
function level1(): string {
  const cleanups: string[] = [];
  try { return level2(); }
  catch (e) { cleanups.push("caught"); throw e; }
  finally { cleanups.push("finally"); console.log(cleanups.join(",")); }
}
try { level1(); } catch (e) { console.log("top", (e as Error).message); }
function loop(): number {
  let total = 0;
  for (let i = 0; i < 5; i++) {
    try { if (i === 2) throw new Error("at " + i); total += i; }
    catch { total += 100; }
    finally { total += 1; }
  }
  return total;
}
console.log(loop());
