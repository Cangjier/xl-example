// xl:title 承诺与 await 的微任务次序（再走一遍混合形状）
// xl:round 683
// xl:judge stdout
// xl:end
const log: string[] = [];
async function inner() { log.push('i1'); await null; log.push('i2'); }
(async () => {
  log.push('a');
  const p = inner();
  log.push('b');
  await p;
  log.push('c');
  await 0;
  log.push('d');
  console.log(log.join(','));
})();
