// xl:title toFixed / toPrecision 在进位、负数、很大很小上的读数
// xl:judge stdout
// xl:end

console.log((1.005).toFixed(2), (2.5).toFixed(0), (-2.5).toFixed(0), (0).toFixed(2));
console.log((1234.5678).toFixed(1), (0.000001).toFixed(7), (1e21).toFixed(2));
console.log((123.456).toPrecision(4), (0.000123).toPrecision(2), (1).toPrecision(3));
