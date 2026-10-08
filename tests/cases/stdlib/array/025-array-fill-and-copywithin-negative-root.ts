// xl:title fill / copyWithin 的负下标与越界
// xl:judge stdout
// xl:end

console.log([1, 2, 3, 4].fill(0, -2).join(","));
console.log([1, 2, 3, 4].fill(9, 1, -1).join(","));
console.log([1, 2, 3, 4, 5].copyWithin(0, 3).join(","));
console.log([1, 2, 3, 4, 5].copyWithin(-2, 0).join(","));
