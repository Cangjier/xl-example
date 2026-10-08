// xl:title fill / copyWithin 的负下标
// xl:round 291
// xl:judge stdout
// xl:end

const a = [1, 2, 3, 4];
console.log(a.fill(0, 1, 3).join(","));
console.log([1, 2, 3, 4].fill(9, -2).join(","));
console.log([1, 2, 3, 4, 5].copyWithin(0, 3).join(","));
console.log([1, 2, 3, 4, 5].copyWithin(1, -2).join(","));
