// xl:title 闭包捕获循环变量：let 每轮一个绑定
// xl:round 623
// xl:judge stdout
// xl:end

const fs: Array<() => number> = [];
for (let i = 0; i < 3; i++) fs.push(() => i);
console.log(fs.map((g) => g()).join(","));
const gs: Array<() => number> = [];
for (var j = 0; j < 3; j++) gs.push(() => j);
console.log(gs.map((g) => g()).join(","));
