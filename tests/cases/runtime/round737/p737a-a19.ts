// xl:title 微任务的**相对次序**：同步 / `then` / `queueMicrotask` / `await`
// xl:round 737
// xl:judge stdout
// xl:end
const log: string[] = [];
queueMicrotask(() => log.push("qm"));
Promise.resolve().then(() => log.push("p1")).then(() => log.push("p2"));
(async () => { log.push("a-start"); await null; log.push("a-after"); })();
log.push("sync");
async function report() { await 0; await 0; await 0; console.log(log.join(",")); }
report();
