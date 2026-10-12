// xl:title Promise.all / allSettled / race / any 的形状
// xl:round 623
// xl:judge stdout
// xl:end

Promise.all([1, Promise.resolve(2)]).then((v) => console.log("all", v.join(",")));
Promise.allSettled([Promise.resolve(1), Promise.reject(new Error("x"))]).then((r) =>
  console.log("settled", r.map((x: any) => x.status).join(",")));
Promise.race([Promise.resolve("a")]).then((v) => console.log("race", v));
Promise.any([Promise.reject(new Error("y")), Promise.resolve("b")]).then((v) => console.log("any", v));
