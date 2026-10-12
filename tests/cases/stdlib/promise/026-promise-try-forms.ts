// xl:title `Promise.try`：同步值、多实参、异步返回值
// xl:round 331
// xl:judge stdout
// xl:end

console.log(typeof Promise.try);
Promise.try(() => 7).then((v) => console.log("sync", v));
Promise.try((a, b) => a * b, 6, 7).then((v) => console.log("args", v));
Promise.try(() => Promise.resolve("inner")).then((v) => console.log("adopt", v));
console.log("first");
