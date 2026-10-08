// xl:title 访问器里抛错时的展开与清理
// xl:round 371
// xl:judge stdout
// xl:end
const log: string[] = [];
const o: any = {
  get bad() { log.push("get"); throw new Error("getter"); },
  set bad(_v: unknown) { log.push("set"); throw new Error("setter"); },
};
try { console.log(o.bad); } catch (e) { log.push("caught:" + (e as Error).message); }
try { o.bad = 1; } catch (e) { log.push("caught:" + (e as Error).message); }
const nested: any = { inner: o };
try { nested.inner.bad; } catch (e) { log.push("deep"); }
function safe(v: () => unknown): unknown { try { return v(); } catch { return "fallback"; } }
console.log(safe(() => o.bad), log.join(","));
