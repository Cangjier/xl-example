// xl:title 承诺链：`then` 的返回值、错误穿透、`finally` 的透传
// xl:round 747
// xl:judge stdout
// xl:end
Promise.resolve(1)
  .then((v) => v + 1)
  .then((v) => { throw new Error("boom" + v); })
  .then(() => "not here")
  .catch((e) => "caught:" + (e as Error).message)
  .then((v) => console.log("chain", v));
Promise.reject("r").catch((e) => console.log("caught2", e));
Promise.resolve(1).then((v) => { throw new Error("m"); }).catch((e) => console.log("c3", (e as Error).message));
Promise.all([1, 2]).then((v) => console.log("all", JSON.stringify(v)));
Promise.allSettled([1, Promise.reject("x")]).then((v) => console.log("settled", JSON.stringify(v)));
Promise.race([1, 2]).then((v) => console.log("race", v));
Promise.any([Promise.reject("e"), 2]).then((v) => console.log("any", v));
console.log("sync");
