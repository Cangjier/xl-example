// xl:title 承诺链：值的透传、返回承诺、链上抛错
// xl:round 371
// xl:judge stdout
// xl:end
Promise.resolve(1)
  .then((v) => v + 1)
  .then((v) => Promise.resolve(v * 10))
  .then((v) => { console.log("final", v); return v; })
  .then((v) => { throw new Error("at " + v); })
  .catch((e) => "recovered:" + (e as Error).message)
  .then((v) => console.log(v));
Promise.resolve("a").then(() => {}).then((v) => console.log("undefined-passthrough", v === undefined));
Promise.reject(new Error("r1")).then(() => console.log("skip")).catch((e) => console.log("c1", (e as Error).message));
console.log("sync");
