// xl:title 数字格式化的几个出口
// xl:round 7
// xl:judge stdout
// xl:end

const n = 1234.5678;
console.log(n.toFixed(2), n.toFixed(0), (-1.5).toFixed(0));
console.log(n.toPrecision(6), (0.0001234).toPrecision(2));
console.log((255).toString(16), (255).toString(2), (8).toString(8));
console.log(Number.isInteger(n), Number.isSafeInteger(2 ** 53), Number.isFinite(Infinity));
console.log(Number.parseInt("42px", 10), Number.parseFloat("3.5e2"), Number("  7  "));
console.log(Math.trunc(-2.7), Math.sign(-0), Math.hypot(3, 4), Math.cbrt(27), (2 ** 31 | 0));
