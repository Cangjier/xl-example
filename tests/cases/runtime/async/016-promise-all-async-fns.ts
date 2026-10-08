// xl:title `Promise.all` 里是几个 async 函数
// xl:round 305
// xl:judge stdout
// xl:end

async function f(n: number) { return n * 2; }
Promise.all([f(1), f(2), 3]).then((xs) => console.log(xs.join(",")));
console.log("start");
