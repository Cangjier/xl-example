// xl:title 默认排序走字符串 / 数字比较器 / 反向
// xl:judge stdout
// xl:end

console.log([10, 9, 1].sort().join(","));
console.log([10, 9, 1].sort((a, b) => a - b).join(","));
console.log(["b", "a", "C"].sort().join(","));
console.log([3, 1, 2].sort((a, b) => b - a).join(","));
