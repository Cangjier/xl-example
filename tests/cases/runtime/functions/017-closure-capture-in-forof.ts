// xl:title for..of 里每个迭代一格闭包
// xl:round 304
// xl:judge stdout
// xl:end

const fns: Array<() => number> = [];
for (const n of [1, 2, 3]) fns.push(() => n);
console.log(fns.map((f) => f()).join(","));
const byIndex: Array<() => number> = [];
for (let i = 0; i < 3; i++) byIndex.push(() => i);
console.log(byIndex.map((f) => f()).join(","));
