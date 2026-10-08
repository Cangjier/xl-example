// xl:title `Math` / `Number` 的静态边界
// xl:round 748
// xl:judge stdout
// xl:end
console.log(Math.max(), Math.min(), Math.max(1, NaN), Math.min(0, -0));
console.log(Math.round(-0.5), Math.round(0.5), Math.round(-1.5), Math.trunc(-1.7), Math.sign(-0));
console.log(Number.isInteger(1.0), Number.isSafeInteger(2 ** 53), Number.parseInt("0x10"), Number.parseInt("10", 2));
console.log(Number(""), Number(" "), Number(null), Number(undefined), Number("0b11"));
console.log((1.005).toFixed(2), (1234.5678).toPrecision(3), (-0).toString(), (1e21).toString());
