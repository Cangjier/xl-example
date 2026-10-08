// xl:title `async` 函数 `return` 一个承诺：结果承诺采纳它
// xl:round 305
// xl:judge stdout
// xl:end

async function f() { return Promise.resolve(7); }
f().then((v) => console.log("v", v));
console.log("sync");
