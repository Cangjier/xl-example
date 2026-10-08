// xl:title Promise.reject / catch / finally
// xl:judge stdout
// xl:end

Promise.reject("r").catch((e: any) => console.log("caught", e));
Promise.resolve(1).finally(() => console.log("fin")).then((v: any) => console.log("after", v));
