// xl:title log / log2 / log10 / log1p / exp / expm1
// xl:round 371
// xl:judge stdout
// xl:end
console.log(Math.log(1), Math.log(0), Math.log(-1));
console.log(Math.log2(8), Math.log10(1000), Math.log1p(0));
console.log(Math.exp(0), Math.expm1(0), Math.log1p(Math.E - 1));
console.log(Math.exp(1) === Math.E);
