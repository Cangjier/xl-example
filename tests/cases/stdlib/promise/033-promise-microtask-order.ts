// xl:title 微任务顺序：then 链、await、queueMicrotask 的穿插
// xl:round 371
// xl:judge stdout
// xl:end
console.log("1");
Promise.resolve().then(() => console.log("2"));
queueMicrotask(() => console.log("3"));
Promise.resolve().then(() => console.log("4")).then(() => console.log("5"));
console.log("6");
(async () => { console.log("7"); await null; console.log("8"); })();
console.log("9");
