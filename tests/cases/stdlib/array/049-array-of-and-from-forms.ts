// xl:title Array.of 与 Array.from 的三种来源
// xl:round 304
// xl:judge stdout
// xl:end

console.log(Array.of(1, 2, 3).join(","), Array.of(3).length, new Array(3).length);
console.log(Array.from([1, 2], (x) => x * 2).join(","));
console.log(Array.from({ length: 3 }, (_, i) => i).join(","));
