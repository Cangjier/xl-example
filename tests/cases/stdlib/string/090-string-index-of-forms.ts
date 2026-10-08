// xl:title indexOf / lastIndexOf / includes / startsWith / endsWith 的起始位
// xl:round 371
// xl:judge stdout
// xl:end
const s = "abcabc";
console.log(s.indexOf("a"), s.indexOf("a", 1), s.indexOf("z"), s.indexOf(""));
console.log(s.lastIndexOf("a"), s.lastIndexOf("a", 2), s.lastIndexOf("z"));
console.log(s.includes("bc"), s.includes("bc", 3), s.startsWith("bc", 1), s.endsWith("ab", 5));
