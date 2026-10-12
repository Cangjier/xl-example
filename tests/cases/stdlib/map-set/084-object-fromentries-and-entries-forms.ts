// xl:title Object.fromEntries：数组对 / Map / 重复键后者赢
// xl:judge stdout
// xl:end

console.log(JSON.stringify(Object.fromEntries([["a", 1], ["b", 2], ["a", 3]])));
console.log(JSON.stringify(Object.fromEntries(new Map([["x", 1]]))));
console.log(Object.keys(Object.fromEntries([])).length, Object.fromEntries([["n", undefined]]).n);
