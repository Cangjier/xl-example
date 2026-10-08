// xl:title 数字格式化：toString 的基数、toFixed、指数与判别
// xl:round 323
// xl:judge stdout
// xl:end

console.log((255).toString(16), (8).toString(2), (1.5).toFixed(0), (1.005).toFixed(2));
console.log((1234.5).toExponential(2), (0.00012).toString());
console.log(Number.isInteger(1.0), Number.isFinite(Infinity), Number.isNaN(NaN), Number.parseInt("0x1f", 16));
