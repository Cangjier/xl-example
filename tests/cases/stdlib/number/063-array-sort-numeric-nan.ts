// xl:title Array.sort：数字比较器与 NaN 的位置
// xl:round 676
// xl:judge stdout
// xl:end

const xs = [10, 9, 100, 1];
console.log(xs.slice().sort((a, b) => a - b).join(","));
console.log([3, NaN, 1, 2].sort((a, b) => a - b).length);
console.log([3, NaN, 1, 2].sort((a, b) => a - b).join(","));
