// xl:title toString(radix) / toFixed / toPrecision / toExponential
// xl:round 291
// xl:judge stdout
// xl:end

console.log((255).toString(16), (255).toString(2), (8).toString(8));
console.log((1.005).toFixed(2), (2.5).toFixed(0), (1.45).toFixed(1));
console.log((1234.5678).toPrecision(3), (0.000123).toExponential(2));
