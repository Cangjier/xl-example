// xl:title `toString(radix)` 与非常大的数
// xl:round 691
// xl:judge stdout
// xl:end
console.log((255).toString(16), (255).toString(2), (-255).toString(16));
console.log((1e21).toString());
console.log((0.1 + 0.2).toString());
