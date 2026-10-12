// xl:title 字符串与数字的算术语义：空串是 0、空白是 0、非数字是 NaN
// xl:judge stdout
// xl:end

console.log("" * 1, "  " * 1, "12" * 2, "12px" * 2, true * 1, null * 1);
console.log(undefined * 1, [5] * 1, [1, 2] * 1, [] * 1);
console.log(+"3.5", +"-0", +"0x10", +"1e3");
