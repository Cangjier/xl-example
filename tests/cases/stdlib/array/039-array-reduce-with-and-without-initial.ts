// xl:title reduce：带初值 / 不带初值 / reduceRight
// xl:round 291
// xl:judge stdout
// xl:end

console.log([1, 2, 3].reduce((a, b) => a + b));
console.log([1, 2, 3].reduce((a, b) => a + b, 10));
console.log([].reduce((a, b) => a + b, "seed"));
console.log([1, 2].reduceRight((a, b) => a + "-" + b));
