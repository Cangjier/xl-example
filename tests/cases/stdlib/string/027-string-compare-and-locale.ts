// xl:title 字符串比较：`<` / localeCompare / 大小写
// xl:judge stdout
// xl:end

console.log("a" < "b", "B" < "a", "abc" < "abd", "a" === "a");
console.log("a".localeCompare("b"), "b".localeCompare("a"), "a".localeCompare("a"));
console.log("ABC".toLowerCase(), "abc".toUpperCase(), "aB".toUpperCase());
