// xl:title `JSON.stringify` 的 replacer **数组**（键过滤与次序）
// xl:round 736
// xl:judge stdout
// xl:end
const o = { a: 1, b: 2, c: 3 };
console.log(JSON.stringify(o, ["c", "a"] as any));
console.log(JSON.stringify(o, [] as any));
console.log(JSON.stringify([1, 2], ["0"] as any));
