// xl:title Promise.any 的聚合错误与 race 的第一个结清
// xl:round 323
// xl:judge stdout
// xl:end

Promise.any([Promise.reject("a"), Promise.resolve(2)]).then((v) => console.log("any", v));
Promise.any([Promise.reject("x"), Promise.reject("y")]).catch((e) => console.log("agg", e.errors.join(",")));
Promise.race([Promise.resolve("fast"), new Promise(() => {})]).then((v) => console.log("race", v));
