// xl:title Array.from 的三种源：数组式对象 / 字符串 / 可迭代
// xl:round 291
// xl:judge stdout
// xl:end

console.log(Array.from({ length: 3 }, (_v, i) => i * 2).join(","));
console.log(Array.from("abc").join("-"));
console.log(Array.from(new Set([1, 1, 2])).join(","));
