// xl:title `Number` 的常量与断言族
// xl:round 691
// xl:judge stdout
// xl:end
console.log(Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, Number.POSITIVE_INFINITY);
console.log(Number.isInteger(1.0), Number.isInteger(1.5), Number.isSafeInteger(2 ** 53));
console.log(Number.isNaN(NaN), Number.isNaN("NaN"), Number.isFinite("1"), Number.isFinite(1));
