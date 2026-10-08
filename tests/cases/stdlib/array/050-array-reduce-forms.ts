// xl:title reduce 的初值与空数组
// xl:round 304
// xl:judge stdout
// xl:end

console.log([1, 2, 3].reduce((a, b) => a + b));
console.log([1, 2, 3].reduce((a, b) => a + b, 10));
console.log([].reduce((a, b) => a + b, 0));
const words = ["a", "b"];
console.log(words.reduce((acc, w, i) => acc + i + w, ""));
