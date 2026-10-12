// xl:title `Set` 从各种可迭代对象构造
// xl:round 330
// xl:judge stdout
// xl:end

console.log([...new Set([1, 1, 2, 3, 3])].join(","));
console.log([...new Set("aabbc")].join(""));
console.log([...new Set(new Map([["x", 1], ["y", 2]]).keys())].join(","));
console.log(new Set([NaN, NaN]).size, new Set([0, -0]).size);
