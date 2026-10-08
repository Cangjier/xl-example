// xl:title 大小写与 localeCompare（只要求符号与零判定）
// xl:round 291
// xl:judge stdout
// xl:end

console.log("AbC".toLowerCase(), "AbC".toUpperCase());
console.log("abc".localeCompare("abd"), "abc".localeCompare("abc"));
console.log("a".localeCompare("a") === 0, "b".localeCompare("a") > 0);
