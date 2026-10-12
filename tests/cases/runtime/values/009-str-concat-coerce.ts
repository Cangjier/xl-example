// xl:title `+` 一边是字符串就是拼接：其余类型怎么变文本
// xl:judge stdout
// xl:end

console.log("n=" + 1, "b=" + true, "z=" + null, "u=" + undefined);
console.log(1 + "2", "2" + 1, true + "x", null + "x");
console.log("a" + "b" + "c", "" + 0);
