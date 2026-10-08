// xl:title 执行器里同步抛错 = 拒绝；resolve 之后抛错被忽略
// xl:round 371
// xl:judge stdout
// xl:end
new Promise(() => { throw new Error("sync"); }).catch((e) => console.log("caught", e.message));
new Promise((res) => { res(1); throw new Error("late"); }).then((v) => console.log("v", v));
new Promise((res, rej) => { res(1); rej(new Error("second")); }).then((v) => console.log("first-wins", v));
console.log("sync");
