// xl:title Object.keys / entries 作用在数组与字符串上
// xl:round 304
// xl:judge stdout
// xl:end

console.log(Object.keys([1, 2, 3]).join(","));
console.log(Object.entries([7, 8]).map((p) => p[0] + p[1]).join(","));
console.log(Object.keys("ab").join(","), Object.values({ x: 1, y: 2 }).join(","));
