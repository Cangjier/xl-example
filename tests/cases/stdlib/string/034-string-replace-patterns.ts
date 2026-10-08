// xl:title replace / replaceAll：字符串模式、$& 与 $1 一类替换记号、函数替换
// xl:judge stdout
// xl:end

console.log("a-b-c".replace("-", "+"), "a-b-c".replaceAll("-", "+"));
console.log("abc".replace("b", "[$&]"), "abc".replace("b", "$'" + "|" + "$" + "`"));
console.log("abc".replace("b", (m: string) => m.toUpperCase()));
console.log("aaa".replaceAll("a", (m: string, i: number) => String(i)).length);
