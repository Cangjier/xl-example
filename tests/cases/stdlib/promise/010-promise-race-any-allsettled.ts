// xl:title Promise.race / any / allSettled
// xl:judge stdout
// xl:end

Promise.race([Promise.resolve(1), Promise.resolve(2)]).then((v) => console.log("race", v));
Promise.any([Promise.reject(new Error("x")), Promise.resolve(3)]).then((v) => console.log("any", v));
Promise.allSettled([Promise.resolve(1), Promise.reject(new Error("y"))]).then((rs) => console.log(rs.map((r) => r.status).join(",")));
