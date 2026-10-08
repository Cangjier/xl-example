// xl:title includes / lastIndexOf 的起始下标（含负数）
// xl:round 291
// xl:judge stdout
// xl:end

const xs = [1, 2, 3, 2];
console.log(xs.includes(2, 2), xs.includes(1, -3), xs.includes(1, 1));
console.log(xs.lastIndexOf(2), xs.lastIndexOf(2, -2), xs.lastIndexOf(9));
