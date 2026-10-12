// xl:title String.split 的 limit 与空串分隔
// xl:round 623
// xl:judge stdout
// xl:end

console.log("a,b,c".split(",", 2).join("|"));
console.log("abc".split("").join("-"));
console.log("".split(",").length, "a".split(",").length);
