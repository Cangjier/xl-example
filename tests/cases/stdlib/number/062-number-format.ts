// xl:title Number.toFixed / toPrecision / toString(radix) 与安全整数
// xl:round 676
// xl:judge stdout
// xl:end

const n = 1234.5678;
console.log(n.toFixed(2), n.toPrecision(6), n.toString(16));
console.log((255).toString(2), (0.5).toFixed(1), (-0).toFixed(0));
console.log(Number.isSafeInteger(2 ** 53 - 1), Number.isSafeInteger(2 ** 53));
