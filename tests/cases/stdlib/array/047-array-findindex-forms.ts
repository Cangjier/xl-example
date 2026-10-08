// xl:title findIndex / findLastIndex 的命中与未命中
// xl:round 304
// xl:judge stdout
// xl:end

const xs = [5, 12, 8, 130, 44];
console.log(xs.findIndex((n) => n > 10), xs.findLastIndex((n) => n > 10));
console.log(xs.findIndex((n) => n > 1000), xs.findLast((n) => n > 10));
