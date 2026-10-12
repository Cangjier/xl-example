// xl:title 字符串的 + 与 concat：转换表
// xl:round 291
// xl:judge stdout
// xl:end

console.log("a" + 1 + true, 1 + 2 + "x", "a" + null + undefined);
console.log(String(1), String(null), String(undefined), String(true));
console.log("x".concat("y", "z", 1));
