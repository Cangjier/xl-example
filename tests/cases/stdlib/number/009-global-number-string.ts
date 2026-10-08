// xl:title Number(x) / String(x)：转换表
// xl:judge stdout
// xl:end

console.log(Number("12"), Number(""), Number(" 7 "), Number("x"), Number(true), Number(null));
console.log(String(1), String(true), String(null), String(undefined), String([1, 2]), String({}));
