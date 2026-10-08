// xl:title Number.toFixed / toPrecision / toExponential（含进位与负数）
// xl:round 623
// xl:judge stdout
// xl:end

console.log((1.005).toFixed(2), (2.5).toFixed(0), (-1.5).toFixed(1), (0).toFixed(3));
console.log((123.456).toPrecision(4), (0.000123).toExponential(2));
