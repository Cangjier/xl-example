// xl:title 闭包与帧：for 的 let 每次迭代一个新绑定（var 只有一个）
// xl:round 7
// xl:judge stdout
// xl:end

const fs: Array<() => number> = [];
for (let i = 0; i < 3; i++) fs.push(() => i);
const gs: Array<() => number> = [];
for (var j = 0; j < 3; j++) gs.push(() => j);
console.log(fs.map((f) => f()).join(","));
console.log(gs.map((f) => f()).join(","));
