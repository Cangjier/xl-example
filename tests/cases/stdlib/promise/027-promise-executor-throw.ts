// xl:title 执行器里抛：结果承诺被拒绝，后面的语句照样跑
// xl:round 331
// xl:judge stdout
// xl:end

new Promise(() => { throw new Error("boom"); }).catch((e) => console.log("caught", e.message));
console.log("after");
