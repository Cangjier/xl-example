// xl:title indexOf / lastIndexOf / includes / startsWith / endsWith 的起始位
// xl:judge stdout
// xl:end

const s = "abcabc";
console.log(s.indexOf("a"), s.indexOf("a", 1), s.indexOf("z"));
console.log(s.lastIndexOf("a"), s.lastIndexOf("a", 3), s.lastIndexOf("z"));
console.log(s.includes("bc", 2), s.startsWith("bc", 1), s.endsWith("ab", 5));
console.log("".includes(""), "".startsWith(""), "abc".endsWith("", 1));
