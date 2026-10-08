// xl:title Object.fromEntries 的三种来源
// xl:round 304
// xl:judge stdout
// xl:end

console.log(JSON.stringify(Object.fromEntries([["a", 1], ["b", 2]])));
console.log(JSON.stringify(Object.fromEntries(new Map([["k", "v"]]))));
console.log(JSON.stringify(Object.fromEntries([["x", 1], ["x", 2]])));
