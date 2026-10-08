// xl:title replace 的记号与函数两种替换文本
// xl:round 7
// xl:judge stdout
// xl:end

console.log("a-b-c".replace("-", "[$&]"));
console.log("a-b-c".replaceAll("-", "<$'>"));
console.log("x1y2".replace("1", () => "$&literal"));
console.log("abc".replace("b", (m, i) => i + ":" + m));
console.log("aaa".split("a").length, "aaa".split("").join("|"));
