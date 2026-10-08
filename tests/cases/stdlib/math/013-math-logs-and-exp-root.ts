// xl:title Math.log / log2 / log10 / exp / log1p / expm1 的读数
// xl:judge stdout
// xl:end

console.log(Math.log(1), Math.log(0), Math.log(-1) !== Math.log(-1));
console.log(Math.log2(8), Math.log10(1000), Math.log1p(0));
console.log(Math.exp(0), Math.expm1(0), Math.exp(1) > 2.7 && Math.exp(1) < 2.72);
