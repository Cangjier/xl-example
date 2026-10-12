// xl:title Array.from（含映射函数与类数组）/ Array.of
// xl:round 9
// xl:judge stdout
// xl:end

console.log(Array.from({ length: 3 }, (_: unknown, i: number) => i * 2).join(","));
console.log(Array.from(new Set([1, 2, 2, 3])).join(","));
console.log(Array.from("abc").join("-"));
console.log(Array.of(1, "a", true).length);
