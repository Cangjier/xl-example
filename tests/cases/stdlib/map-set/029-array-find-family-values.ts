// xl:title find / findIndex / findLast / findLastIndex 的没找到那一路
// xl:round 291
// xl:judge stdout
// xl:end

const xs = [1, 2, 3, 4];
console.log(xs.find((v) => v > 2), xs.findIndex((v) => v > 2));
console.log(xs.findLast((v) => v < 4), xs.findLastIndex((v) => v < 4));
console.log(xs.find((v) => v > 9), xs.findIndex((v) => v > 9));
