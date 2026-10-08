// xl:title `finally` 把值原样传下去
// xl:round 305
// xl:judge stdout
// xl:end

Promise.resolve(5).finally(() => console.log("fin")).then((v) => console.log("v", v));
