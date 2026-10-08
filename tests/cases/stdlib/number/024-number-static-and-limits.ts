// xl:title Number.isInteger / isSafeInteger / isNaN / isFinite 与三个常量
// xl:round 291
// xl:judge stdout
// xl:end

console.log(Number.isInteger(5), Number.isInteger(5.5), Number.isSafeInteger(2 ** 53), Number.isSafeInteger(2 ** 53 - 1));
console.log(Number.isNaN(NaN), Number.isNaN("x"), Number.isFinite(1), Number.isFinite(Infinity));
console.log(Number.EPSILON > 0, Number.MAX_SAFE_INTEGER, Number.MIN_VALUE > 0);
