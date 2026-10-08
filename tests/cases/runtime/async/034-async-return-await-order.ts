// xl:title async：返回 thenable、await 顺序、微任务与同步的交替
// xl:round 9
// xl:judge stdout
// xl:end

const log: string[] = [];
async function a() { log.push("a1"); await null; log.push("a2"); return "A"; }
async function b() { log.push("b1"); const r = await a(); log.push("b2:" + r); return "B"; }
b().then((v) => { log.push("then:" + v); console.log(log.join(" ")); });
log.push("sync");
