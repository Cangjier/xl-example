// xl:title toString(radix) / parseInt / toFixed 边界
// xl:round 653
// xl:judge stdout
// xl:end

console.log((255).toString(16), (255).toString(2), (-255).toString(16), (0.5).toString(2));
console.log(parseInt("0x1f", 16), parseInt("12px", 10), parseInt("  7 "), parseInt("z", 36));
console.log((1.005).toFixed(2), (0).toFixed(2), (1234.5678).toFixed(3), (1e21).toFixed(2));
console.log((-0).toString(), Object.is(-0, 0), 1 / -0);
