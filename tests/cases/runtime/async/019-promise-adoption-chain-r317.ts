// xl:title 兑现值本身是承诺时的「采纳」：内层已结清 / 内层还挂着 / 内层被拒绝
// xl:round 317
// xl:judge stdout
// xl:end

Promise.resolve(1)
  .then((v) => Promise.resolve(v + 1))
  .then((v) => { console.log("chain", v); return v; })
  .then(async () => 5)
  .then((v) => console.log("pending-inner", v))
  .then(() => Promise.reject(new Error("x")))
  .catch((e: any) => console.log("reject-prop", e.message));
