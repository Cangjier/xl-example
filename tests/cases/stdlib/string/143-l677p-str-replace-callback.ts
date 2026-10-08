// xl:title 点名：replace 的替换函数（无正则、只用字符串）与 replaceAll 的替换串语义
// xl:judge stdout
// xl:end

console.log("xayb".replace("a", (m) => "[" + m + "]"));
console.log("a-b".replaceAll("-", "$$"), "a-b".replace("-", "$&$&"));
console.log("ab".replaceAll("a", (m, i) => m + String(i)));
console.log("abc".replaceAll("", "-"));
