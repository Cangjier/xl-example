// xl:title findLast / findLastIndex 与没找到
// xl:judge stdout
// xl:end

const xs = [1, 2, 3, 4, 5];
console.log(xs.findLast((v) => v % 2 === 1), xs.findLastIndex((v) => v % 2 === 1));
console.log(xs.findLast((v) => v > 99), xs.findLastIndex((v) => v > 99));
