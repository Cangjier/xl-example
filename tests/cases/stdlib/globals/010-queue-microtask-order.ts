// xl:title `queueMicrotask` 排在 `Promise.then` 同一队里
// xl:round 305
// xl:judge stdout
// xl:end

queueMicrotask(() => console.log("micro"));
Promise.resolve().then(() => console.log("then"));
console.log("sync");
