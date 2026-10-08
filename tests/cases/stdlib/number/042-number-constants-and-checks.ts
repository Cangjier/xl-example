// xl:title Number 的常量与三个检查
// xl:round 371
// xl:judge stdout
// xl:end
console.log(Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, Number.EPSILON > 0);
console.log(Number.isInteger(5), Number.isInteger(5.5), Number.isInteger(-0), Number.isInteger("5" as any));
console.log(Number.isSafeInteger(2 ** 53 - 1), Number.isSafeInteger(2 ** 53), Number.isFinite(1 / 0));
console.log(Number.isNaN(NaN), Number.isNaN("NaN" as any), isNaN("NaN" as any));
