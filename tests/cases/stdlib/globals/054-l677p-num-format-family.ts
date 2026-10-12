// xl:title 点名：Number 的 toString 基数 / toPrecision / toExponential / toFixed 边界
// xl:judge stdout
// xl:end

console.log((255).toString(16), (255).toString(2), (8).toString(8), (1.5).toString(2));
console.log((123.456).toFixed(2), (0.005).toFixed(2), (1.005).toFixed(2), (12).toFixed(0), (1.5).toFixed());
console.log((123.456).toPrecision(4), (0.000123).toPrecision(2), (123456).toPrecision(2));
console.log((12345).toExponential(2), (0.00012).toExponential(1), (1).toExponential());
console.log(Number.isFinite(1), Number.isFinite("1"), Number.isInteger(1.0), Number.isInteger(1.5));
console.log(Number.isSafeInteger(2 ** 53 - 1), Number.isSafeInteger(2 ** 53), Number.isNaN(NaN), Number.isNaN("x"));
console.log(Number.parseInt("42px", 10), Number.parseFloat("3.5e2"), Number.parseInt("ff", 16));
console.log(Number.MAX_SAFE_INTEGER, Number.EPSILON, Number.MAX_VALUE > 1e308, Number.MIN_VALUE > 0);
console.log(Number(""), Number(" 12 "), Number("x"), Number(null), Number(undefined), Number(true));
