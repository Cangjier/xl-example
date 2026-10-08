// xl:title 同步 → 微任务 → 下一个微任务的次序
// xl:round 682
// xl:judge stdout
// xl:end
(async () => {
  const order: string[] = [];
  order.push('sync');
  Promise.resolve().then(() => { order.push('t1'); });
  Promise.resolve().then(() => { order.push('t2'); }).then(() => { order.push('t3'); });
  order.push('sync2');
  await Promise.resolve();
  console.log(order.join(','));
})();
