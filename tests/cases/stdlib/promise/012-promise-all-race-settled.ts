// xl:title Promise.all / race / allSettled 三种组合
// xl:round 291
// xl:judge stdout
// xl:end

Promise.all([1, Promise.resolve(2)]).then((xs) => console.log("all", xs.join(",")));
Promise.allSettled([Promise.resolve(1), Promise.reject(new Error("x"))]).then((rs) => console.log("settled", rs.length, rs[0].status, rs[1].status));
Promise.race([Promise.resolve("fast"), new Promise(() => {})]).then((v) => console.log("race", v));
