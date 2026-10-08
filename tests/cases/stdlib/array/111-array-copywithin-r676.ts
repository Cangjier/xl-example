// xl:title Array.copyWithin：区间、负索引与重叠
// xl:round 676
// xl:judge stdout
// xl:end

const xs = [1, 2, 3, 4, 5];
console.log(xs.copyWithin(0, 3).join(","));
console.log([1, 2, 3, 4].copyWithin(1, -2).join(","));
console.log(xs.copyWithin(0, 1, 2).join(","));
