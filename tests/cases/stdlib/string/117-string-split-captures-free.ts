// xl:title split 的极限 / 空分隔 / 尾随空串
// xl:round 653
// xl:judge stdout
// xl:end

console.log("a,b,,".split(",").length, JSON.stringify("a,b,,".split(",")));
console.log(JSON.stringify("abc".split("")), JSON.stringify("abc".split("", 2)));
console.log(JSON.stringify("".split(",")), JSON.stringify("a b".split(" ")));
console.log(JSON.stringify("aaa".split("a")), "x".split("y").length);
