// xl:title Number.isInteger / isFinite / isNaN / isSafeInteger / EPSILON
// xl:round 623
// xl:judge stdout
// xl:end

console.log(Number.isInteger(1.0), Number.isInteger("1"), Number.isSafeInteger(2 ** 53));
console.log(Number.isFinite(Infinity), globalThis.isFinite("1" as any));
console.log(Number.isNaN(NaN), Number.EPSILON > 0, Number.MAX_SAFE_INTEGER);
