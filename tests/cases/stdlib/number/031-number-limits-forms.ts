// xl:title Number 的常量族：EPSILON / MAX_SAFE_INTEGER / 各极值
// xl:round 304
// xl:judge stdout
// xl:end

console.log(Number.EPSILON > 0, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER);
console.log(Number.MAX_VALUE > 1e308, Number.MIN_VALUE > 0, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY);
console.log(Number.isSafeInteger(Number.MAX_SAFE_INTEGER), Number.isSafeInteger(Number.MAX_SAFE_INTEGER + 1));
