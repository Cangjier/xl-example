// xl:title 顶层 `for (let …)` 造过闭包之后，循环后面的代码读环境格会读错链
// xl:round 314
// xl:judge stdout
// xl:end

const fns: Array<() => number> = [];
for (let i = 0; i < 3; i++) fns.push(() => i);
console.log("A", fns.map((f) => f()).join(","));
function mk(): () => number { let n = 5; return () => n; }
console.log("H", mk()());
