// xl:title Array.from 的映射函数与类数组 / iterable
// xl:round 623
// xl:judge stdout
// xl:end

console.log(Array.from([1, 2], (x) => x * 2).join(","));
console.log(Array.from("ab").join(","));
console.log(Array.from(new Set([1, 2])).join(","), Array.from({ length: 2 }, (_: any, i: number) => i).join(","));
