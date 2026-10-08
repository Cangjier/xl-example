// xl:title 长数组方法链上的中间值与惰性
// xl:round 371
// xl:judge stdout
// xl:end
const xs = Array.from({ length: 10 }, (_, i) => i);
const result = xs
  .map((v) => v * 2)
  .filter((v) => v % 4 === 0)
  .map((v) => v + 1)
  .reduce((a, b) => a + b, 0);
console.log(result);
let calls = 0;
const counted = xs.filter((v) => { calls += 1; return v > 5; });
console.log(counted.length, calls);
console.log(xs.slice(2, 5).join(","), xs.splice(0, 0).length, xs.length);
