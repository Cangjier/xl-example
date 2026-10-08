// xl:title localeCompare 的 ASCII 符号与排序用法
// xl:round 647
// xl:judge stdout
// xl:end

console.log("a".localeCompare("b") < 0, "b".localeCompare("a") > 0, "a".localeCompare("a"));
console.log("abc".localeCompare("abd") < 0, "ab".localeCompare("abc") < 0);
console.log(["b", "a", "c"].sort((x, y) => x.localeCompare(y)).join(","));
