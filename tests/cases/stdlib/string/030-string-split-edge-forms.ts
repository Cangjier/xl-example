// xl:title split：空分隔符 / 限制个数 / 空串 / 尾部空
// xl:judge stdout
// xl:end

console.log("abc".split("").join("-"));
console.log("a,b,c".split(",", 2).join("|"));
console.log("".split(",").length, "".split("").length);
console.log("a,,b".split(",").map((s) => s.length).join(","));
console.log("aaa".split("aa").join("|"), "x".split("x").length);
