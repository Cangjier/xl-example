// xl:title 经典 `for` 的每一次迭代里再取一个 const 给闭包
// xl:round 305
// xl:judge stdout
// xl:end

const fns: (() => number)[] = [];
for (let i = 0; i < 3; i++) {
  const j = i * 10;
  fns.push(() => j);
}
console.log(fns.map((f) => f()).join(","));
