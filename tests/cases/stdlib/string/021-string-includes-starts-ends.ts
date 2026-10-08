// xl:title includes / startsWith / endsWith 的起始位置
// xl:judge stdout
// xl:end

const s = "hello world";
console.log(s.includes("o"), s.includes("o", 5), s.includes("z"));
console.log(s.startsWith("hello"), s.startsWith("world", 6), s.endsWith("world"));
console.log(s.endsWith("hello", 5));
