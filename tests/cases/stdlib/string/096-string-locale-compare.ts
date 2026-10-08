// xl:title localeCompare 的符号与数字串
// xl:round 371
// xl:judge stdout
// xl:end
console.log("a".localeCompare("b") < 0, "b".localeCompare("a") > 0, "a".localeCompare("a"));
console.log(["b", "a", "c"].sort((x, y) => x.localeCompare(y)).join(""));
console.log("10".localeCompare("9") < 0);
