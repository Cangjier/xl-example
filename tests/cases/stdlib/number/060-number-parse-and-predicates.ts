// xl:title Number.parseInt/parseFloat/isInteger/isSafeInteger/toFixed
// xl:round 8
// xl:judge stdout
// xl:end

console.log(Number.parseInt("12px", 10), Number.parseInt("ff", 16), Number.parseFloat("1.5e2x"));
console.log(Number.isInteger(2.0), Number.isInteger(2.5), Number.isSafeInteger(2 ** 53), Number.isSafeInteger(2 ** 53 - 1));
console.log((1.005).toFixed(2), (2).toFixed(3), (-0).toFixed(1));
