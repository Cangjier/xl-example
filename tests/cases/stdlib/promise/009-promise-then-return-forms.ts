// xl:title then 的返回值：值 / 承诺 / 抛出 三条路各自的下一环
// xl:judge stdout
// xl:end

Promise.resolve(1)
  .then((v) => v + 1)
  .then((v) => Promise.resolve(v * 10))
  .then((v) => { throw new Error("mid"); })
  .catch((e: any) => "caught:" + e.message)
  .then((v) => console.log(v));
Promise.resolve(2).finally(() => console.log("finally")).then((v) => console.log("kept", v));
