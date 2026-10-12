// xl:title 微任务的**相对次序**：同步 / `then` / `queueMicrotask` / `await`
// xl:round 737
// xl:judge stdout
// xl:end
// 本文件是 `p737a-a19` 按命名规范改名（第 805 轮）：**正文一字未动**——
// 它量的是异步调度那一层，包一层壳就会换一个挂点（实测过），所以只改名、不并组。

const log: string[] = [];
queueMicrotask(() => log.push("qm"));
Promise.resolve().then(() => log.push("p1")).then(() => log.push("p2"));
(async () => { log.push("a-start"); await null; log.push("a-after"); })();
log.push("sync");
async function report() { await 0; await 0; await 0; console.log(log.join(",")); }
report();
