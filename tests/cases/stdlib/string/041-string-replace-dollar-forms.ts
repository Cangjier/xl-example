// xl:title replace 的 $& / $` / $' 替换记号
// xl:judge stdout
// xl:end

console.log("abc".replace("b", "[$&]"));
console.log("abc".replace("b", "[$']"));
console.log("abc".replace("b", "$1"), "abc".replace("b", "$$"));
