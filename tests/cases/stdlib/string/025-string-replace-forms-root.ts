// xl:title replace / replaceAll 的字面量替换与特殊字符
// xl:judge stdout
// xl:end

console.log("a-b-c".replace("-", "+"), "a-b-c".replaceAll("-", "+"));
console.log("aaa".replaceAll("a", "b"), "abc".replace("z", "y"));
console.log("a.b".replaceAll(".", "!"), "$x$".replaceAll("$", "#"));
