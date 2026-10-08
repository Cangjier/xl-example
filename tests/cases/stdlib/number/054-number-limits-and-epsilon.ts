// xl:title Number 的边界常量：MAX_SAFE_INTEGER / EPSILON 与加法是否改变数值
// xl:judge stdout
// xl:end

console.log(Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 2 === Number.MAX_SAFE_INTEGER + 1);
console.log(Number.EPSILON > 0, 1 + Number.EPSILON !== 1, Number.MAX_VALUE > 1e308, Number.MIN_VALUE > 0);
console.log(Number.isSafeInteger(Number.MAX_SAFE_INTEGER), Number.isSafeInteger(Number.MAX_SAFE_INTEGER + 1));
