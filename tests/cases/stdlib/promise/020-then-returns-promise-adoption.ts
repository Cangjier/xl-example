// xl:title `then` 回调返回承诺：结果承诺采纳它
// xl:round 305
// xl:judge stdout
// xl:end

Promise.resolve(1)
  .then(() => Promise.resolve(2))
  .then((v) => console.log("value", v));
console.log("sync");
