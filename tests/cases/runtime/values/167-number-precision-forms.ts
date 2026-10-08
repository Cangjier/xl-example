// xl:title 数值精度：安全整数边界与舍入
// xl:round 330
// xl:judge stdout
// xl:end

console.log(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1 === Number.MAX_SAFE_INTEGER + 2);
console.log(0.1 + 0.2 === 0.3, (0.1 + 0.2).toFixed(2));
console.log(9007199254740993, Number.isSafeInteger(9007199254740993));
