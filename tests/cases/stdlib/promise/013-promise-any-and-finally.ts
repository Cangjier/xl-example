// xl:title Promise.any / reject / finally
// xl:round 291
// xl:judge stdout
// xl:end

Promise.any([Promise.reject(new Error("a")), Promise.resolve("b")]).then((v) => console.log("any", v));
Promise.reject(new Error("r")).catch((e) => console.log("catch", e.message));
Promise.resolve(1).finally(() => console.log("finally")).then((v) => console.log("after", v));
