// xl:title replace / replaceAll 的字符串形态与 $ 记号
// xl:round 304
// xl:judge stdout
// xl:end

console.log("a-b-c".replace("-", "+"), "a-b-c".replaceAll("-", "+"));
console.log("abc".replace("b", "[$&]"), "abc".replace("b", "[$`]"), "abc".replace("b", "[$']"));
console.log("ab".replace("a", "$$"));
