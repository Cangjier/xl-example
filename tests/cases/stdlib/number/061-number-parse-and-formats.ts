// xl:title Number：parseInt/parseFloat 的截断、toFixed、进制串
// xl:round 9
// xl:judge stdout
// xl:end

console.log(parseInt("12px"), parseFloat("1.5rem"), Number("  7  "));
console.log((1.005).toFixed(2), (255).toString(16), (255).toString(2).length);
console.log(Number.isInteger(1.0), Number.isFinite(Infinity), Number.isNaN(NaN));
console.log(Number.MAX_SAFE_INTEGER > 0, Number.EPSILON > 0);
