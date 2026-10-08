// xl:title 空数组上的 `every` / `some` / `reduce` 带初值
// xl:round 305
// xl:judge stdout
// xl:end

console.log([].every(() => false), [].some(() => true), [].reduce((a, b) => a + b, 5));
