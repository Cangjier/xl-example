// xl:title 循环变量捕获：let 每个迭代一个、var 共用一个
// xl:judge stdout
// xl:end

const fns: Array<() => number> = [];
for (let i = 0; i < 3; i++) fns.push(() => i);
console.log(fns.map((f) => f()).join(","));
const gns: Array<() => number> = [];
for (var j = 0; j < 3; j++) gns.push(() => j);
console.log(gns.map((f) => f()).join(","));
