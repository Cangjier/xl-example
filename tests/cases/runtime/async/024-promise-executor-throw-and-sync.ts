// xl:title 执行器里抛之后，同一段里的同步语句与微任务
// xl:round 331
// xl:judge stdout
// xl:end

const log: string[] = [];
new Promise(() => {
  log.push("exec");
  throw new Error("x");
}).catch((e) => log.push("catch:" + (e as Error).message));
log.push("sync");
Promise.resolve().then(() => {
  log.push("micro");
  console.log(log.join(","));
});
