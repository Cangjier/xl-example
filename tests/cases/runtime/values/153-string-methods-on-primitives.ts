// xl:title 原始值上的字符串方法：链式调用与只读性
// xl:round 323
// xl:judge stdout
// xl:end

const s = "  Hello World  ";
console.log(s.trim().toLowerCase().split(" ").join("_"));
console.log("abc".toUpperCase(), "abc".charAt(1), "abc".slice(-2), "abc".indexOf("c"));
console.log(s.length, s[0] === " ", "ab".repeat(2));
