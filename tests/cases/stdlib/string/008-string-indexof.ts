// xl:title String.indexOf / includes / startsWith / endsWith
// xl:judge stdout
// xl:end

const s = "hello world";
console.log(s.indexOf("o"), s.indexOf("o", 5), s.indexOf("z"), s.indexOf(""));
console.log(s.includes("world"), s.includes("z"), s.startsWith("hell"), s.endsWith("rld"));
console.log(s.startsWith("world", 6), s.endsWith("hello", 5));
