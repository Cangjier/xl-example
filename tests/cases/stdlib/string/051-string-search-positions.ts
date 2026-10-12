// xl:title indexOf / lastIndexOf / includes / startsWith / endsWith 带位置
// xl:round 291
// xl:judge stdout
// xl:end

const s = "ababab";
console.log(s.indexOf("ab", 1), s.lastIndexOf("ab"), s.lastIndexOf("ab", 3));
console.log(s.includes("ba", 2), s.startsWith("ab", 2), s.endsWith("ab", 4));
console.log(s.indexOf("z"), s.indexOf(""));
