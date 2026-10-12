// xl:title 数组方法链：`map` / `filter` / `reduce` 一起用
// xl:round 331
// xl:judge stdout
// xl:end

const numbers = [5, 12, 8, 130, 44];
const result = numbers
  .filter((n) => n > 10)
  .map((n) => n * 2)
  .reduce((sum, n) => sum + n, 0);
console.log(result);
console.log(numbers.find((n) => n > 100), numbers.findIndex((n) => n > 100));
console.log(numbers.some((n) => n < 0), numbers.every((n) => n > 0));
