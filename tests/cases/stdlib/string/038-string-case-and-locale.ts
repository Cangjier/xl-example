// xl:title 大小写与 localeCompare 的确定读数
// xl:judge stdout
// xl:end

console.log("aBc".toUpperCase(), "AbC".toLowerCase());
console.log("a".localeCompare("b"), "b".localeCompare("a"), "a".localeCompare("a"));
console.log("abc".toUpperCase().length, "İ".length);
