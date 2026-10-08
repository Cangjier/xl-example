// xl:title Array.copyWithin / fill：负下标与越界
// xl:round 623
// xl:judge stdout
// xl:end

const a = [1, 2, 3, 4, 5];
console.log(a.copyWithin(0, 3).join(","));
console.log(a.copyWithin(1, -2).join(","));
console.log([1, 2, 3].fill(9, -2).join(","));
console.log([1, 2, 3].fill(0, 5).join(","));
