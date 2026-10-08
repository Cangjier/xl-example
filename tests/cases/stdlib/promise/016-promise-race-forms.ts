// xl:title Promise.race / allSettled / any 的三种结清
// xl:round 304
// xl:judge stdout
// xl:end

Promise.race([Promise.resolve("fast"), new Promise((r) => r("slow"))]).then((v) => console.log("race", v));
Promise.allSettled([Promise.resolve(1), Promise.reject(new Error("x"))]).then((rs) => console.log(rs.map((r) => r.status).join(",")));
Promise.any([Promise.reject(new Error("a")), Promise.resolve("ok")]).then((v) => console.log("any", v));
