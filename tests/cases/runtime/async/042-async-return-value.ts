// xl:title `async` 函数返回的 Promise 与 `.then` 的值
// xl:round 691
// xl:judge stdout
// xl:end
async function f(x: number): Promise<number> { return x + 1; }
f(1).then((v: number) => console.log("v", v));
console.log(typeof f(1).then);
