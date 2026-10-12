// xl:title 大数组上的 reduce / filter / map 串起来
// xl:round 304
// xl:judge stdout
// xl:end

const xs = Array.from({ length: 2000 }, (_, i) => i + 1);
const total = xs.filter((n) => n % 3 === 0).map((n) => n * 2).reduce((a, b) => a + b, 0);
console.log(total, xs.length);
