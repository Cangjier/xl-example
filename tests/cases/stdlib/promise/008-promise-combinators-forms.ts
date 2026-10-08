// xl:title Promise.all / race / resolve / reject 的结清顺序
// xl:judge stdout
// xl:end

Promise.all([Promise.resolve(1), 2, Promise.resolve(3)]).then((xs) => console.log("all", xs.join(",")));
Promise.all([]).then((xs) => console.log("empty", xs.length));
Promise.race([Promise.resolve("fast"), new Promise(() => {})]).then((v) => console.log("race", v));
Promise.resolve("r").then((v) => console.log("resolve", v));
Promise.reject(new Error("nope")).catch((e: any) => console.log("reject", e.message));
