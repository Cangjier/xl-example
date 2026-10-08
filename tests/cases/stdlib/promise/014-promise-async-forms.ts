// xl:title async 函数与立即调用的 async 箭头
// xl:round 291
// xl:judge stdout
// xl:end

async function f(n: number) { return n * 2; }
async function g() { const v = await f(3); console.log("g", v); }
g();
(async () => { console.log("iife", await Promise.resolve("z")); })();
