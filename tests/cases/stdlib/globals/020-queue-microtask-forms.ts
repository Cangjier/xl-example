// xl:title `queueMicrotask` 的次序与嵌套
// xl:round 332
// xl:judge stdout
// xl:end

queueMicrotask(() => {
  console.log("a");
  queueMicrotask(() => console.log("a2"));
});
Promise.resolve().then(() => console.log("p"));
queueMicrotask(() => console.log("b"));
console.log("sync");
