// xl:title 数组管道的链式写法
// xl:round 291
// xl:judge stdout
// xl:end

const xs = [5, 3, 8, 1];
console.log(xs.filter((n) => n > 2).map((n) => n * 2).reduce((a, b) => a + b, 0));
console.log(xs.slice().sort((a, b) => a - b).join(","), xs.join(","));
