// xl:title `reduceRight` 与 `findIndex` / `findLastIndex`
// xl:round 305
// xl:judge stdout
// xl:end

console.log([1, 2, 3].reduceRight((a, b) => a + "" + b), [1, 2, 3].findIndex((n) => n > 1), [1, 2, 3].findLastIndex((n) => n < 3));
