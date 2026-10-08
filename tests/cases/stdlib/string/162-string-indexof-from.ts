// xl:title `indexOf` / `lastIndexOf` 的起始位置
// xl:round 691
// xl:judge stdout
// xl:end
const s = "ababab";
console.log(s.indexOf("ab", 1), s.lastIndexOf("ab", 3), s.indexOf("", 99));
console.log("abc".startsWith("b", 1), "abc".endsWith("b", 2));
console.log("abc".includes("", 9));
