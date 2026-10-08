// xl:title `sort` 的默认序与比较器形态
// xl:round 330
// xl:judge stdout
// xl:end

console.log([10, 9, 100, 1].sort().join(","));
console.log([10, 9, 100, 1].sort((a, b) => a - b).join(","));
console.log(["b", "a", "C"].sort().join(","));
console.log([3, 1, 2].sort(() => 0).join(","));
