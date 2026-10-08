// xl:title 链式 `then` 的次序（每一环一个新微任务）
// xl:round 691
// xl:judge stdout
// xl:end
Promise.resolve(1)
  .then((v: number) => { console.log("t1", v); return v + 1; })
  .then((v: number) => { console.log("t2", v); });
console.log("sync");
