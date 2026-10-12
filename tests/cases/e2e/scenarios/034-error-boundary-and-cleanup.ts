// xl:title 端到端：资源清理与错误边界（try/finally 嵌套）
// xl:round 323
// xl:judge stdout
// xl:end

const log: string[] = [];
function withResource<T>(name: string, body: () => T): T {
  log.push("open:" + name);
  try { return body(); } finally { log.push("close:" + name); }
}
function work(fail: boolean): string {
  return withResource("db", () => {
    withResource("tx", () => { if (fail) throw new Error("boom"); });
    return "committed";
  });
}
console.log(work(false));
try { work(true); } catch (e) { console.log("caught", (e as Error).message); }
console.log(log.join(","));
