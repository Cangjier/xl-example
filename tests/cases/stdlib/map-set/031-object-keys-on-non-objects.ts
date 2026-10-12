// xl:title Object.keys 吃数组 / 字符串，键的整数优先序
// xl:round 291
// xl:judge stdout
// xl:end

console.log(Object.keys([1, 2]).join(","), Object.keys("ab").join(","));
console.log(Object.values({ a: 1, b: 2 }).join(","), Object.entries({ a: 1 })[0].join(":"));
console.log(Object.keys({ b: 1, 2: 2, a: 3, 1: 4 }).join(","));
