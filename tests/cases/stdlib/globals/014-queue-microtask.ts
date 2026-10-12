// xl:title queueMicrotask：与 Promise.then 同一个队列、按序
// xl:round 323
// xl:judge stdout
// xl:end

queueMicrotask(() => console.log("micro-1"));
Promise.resolve().then(() => console.log("then-1"));
queueMicrotask(() => console.log("micro-2"));
console.log("sync");
