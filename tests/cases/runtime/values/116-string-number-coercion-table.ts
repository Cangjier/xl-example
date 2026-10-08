// xl:title 字符串与数字的隐式转换表
// xl:round 304
// xl:judge stdout
// xl:end

console.log("5" * 2, "5" + 2, "5" - 2, "" + null, "" + undefined, 1 / "2");
console.log([1, 2] + "", [] + "", [null] + "", true + 1, null + 1, undefined + 1);
console.log(Number("  12  "), Number(""), Number("0x10"), Number("1e3"));
