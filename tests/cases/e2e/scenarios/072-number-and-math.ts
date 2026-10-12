// xl:title 数字、`Math` 与解析
// xl:round 338
// xl:judge stdout
// xl:end

console.log((1.005).toFixed(2), (255).toString(16), (8).toString(2));
console.log(parseInt("42px", 10), parseFloat("3.5rem"), Number("  12  "), Number("x"));
console.log(Number.isInteger(3), Number.isInteger(3.5), Number.isFinite(Infinity));
console.log(Math.round(2.5), Math.floor(-1.5), Math.trunc(-1.7), Math.sign(-3));
console.log(Math.max(1, 9, 5), Math.min(1, 9, 5), Math.pow(2, 10), Math.sqrt(81) , Math.abs(-4));
console.log(Math.PI > 3.14, Number.MAX_SAFE_INTEGER, 0.1 + 0.2);
console.log((1234.5678).toPrecision(6), (0.000001234).toString());
console.log((-0).toString(), 1 / 0, -1 / 0, Number.isNaN(NaN));
