// xl:title repeat / split 的边界
// xl:round 304
// xl:judge stdout
// xl:end

console.log("ab".repeat(0) + "|", "ab".repeat(2), "a".repeat(2.9) + "|");
console.log(JSON.stringify("a,b,,c".split(",")), JSON.stringify("abc".split("")), JSON.stringify("".split(",")));
console.log(JSON.stringify("a1b2c".split("1")));
