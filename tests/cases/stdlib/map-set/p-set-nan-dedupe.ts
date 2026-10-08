// xl:title Set 里 NaN 只留一个
// xl:round 692
// xl:judge stdout
// xl:end

console.log(new Set([NaN, NaN]).size, new Set([-0, 0]).size, [...new Set([3, 1, 3, 2])].join(","));
