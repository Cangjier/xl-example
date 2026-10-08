// xl:title Number.isInteger / isSafeInteger
// xl:round 692
// xl:judge stdout
// xl:end

console.log(Number.isInteger(1.0), Number.isInteger("1"), Number.isSafeInteger(2 ** 53), Number.isSafeInteger(2 ** 53 - 1));
