// xl:title split 的分隔符 / 限制条数 / 空串
// xl:judge stdout
// xl:end

console.log("a,b,,c".split(",").join("|"), "a,b,c".split(",", 2).join("|"));
console.log("abc".split("").join("-"), "abc".split().length, "".split(",").length);
console.log("a1b2c".split("1").join("+"));
