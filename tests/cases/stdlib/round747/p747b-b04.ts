// xl:title `Object.keys` / `values` / `entries` 在数组 / 字符串 / 类数组上
// xl:round 747
// xl:judge stdout
// xl:end
console.log(JSON.stringify(Object.keys([1, , 3])), JSON.stringify(Object.values([1, , 3]).map((v) => String(v))));
console.log(JSON.stringify(Object.entries([1, 2])), JSON.stringify(Object.entries("ab")));
console.log(JSON.stringify(Object.keys("ab")), JSON.stringify(Object.values("ab")));
const like = { length: 2, 0: "x", 1: "y" };
console.log(JSON.stringify(Object.keys(like)), JSON.stringify(Object.values(like)));
console.log(JSON.stringify(Object.keys({ b: 1, 2: 2, a: 3 })));
console.log(JSON.stringify(Object.fromEntries([["a", 1], [2, 3]])));
console.log(JSON.stringify(Object.getOwnPropertyNames([1, 2])), JSON.stringify(Object.getOwnPropertyNames("ab")));
