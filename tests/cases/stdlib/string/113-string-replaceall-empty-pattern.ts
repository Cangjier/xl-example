// xl:title replaceAll 空串模式与函数替换
// xl:round 647
// xl:judge stdout
// xl:end

console.log("abc".replaceAll("", "-"));
console.log("a-b-c".replaceAll("-", (m) => m + m));
console.log("aaa".replaceAll("aa", "b"));
console.log("abc".replaceAll("z", "y"));
