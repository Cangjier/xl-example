// xl:title 字符串方法的链式写法与边界实参
// xl:round 331
// xl:judge stdout
// xl:end

const text = "  Hello, World  ";
console.log(text.trim().toLowerCase().replace("world", "there"));
console.log("abc".padStart(6, "*"), "abc".padEnd(6, "-"));
console.log("a,b,c".split(",").map((part) => part.toUpperCase()).join(""));
console.log("repeat".repeat(2), "x".at(-1), "x".charCodeAt(0));
