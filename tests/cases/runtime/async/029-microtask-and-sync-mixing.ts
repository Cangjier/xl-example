// xl:title 同步代码与微任务的交替次序
// xl:round 371
// xl:judge stdout
// xl:end
const order: string[] = [];
order.push("start");
Promise.resolve().then(() => order.push("p1"));
order.push("sync1");
(async () => { order.push("async-start"); await null; order.push("async-after-await"); })();
queueMicrotask(() => order.push("qm"));
order.push("sync2");
Promise.resolve().then(() => { order.push("p2"); return Promise.resolve(); }).then(() => order.push("p3"));
queueMicrotask(() => console.log("microtask-order", order.join(",")));
console.log("sync-order", order.join(","));
