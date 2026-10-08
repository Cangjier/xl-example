// xl:title Math.sqrt / pow / exp 的特殊值：负底数、0^0、Infinity
// xl:judge stdout
// xl:end

console.log(Math.sqrt(-1), Math.sqrt(0), 1 / Math.sqrt(-0), Math.sqrt(Infinity));
console.log(Math.pow(0, 0), Math.pow(NaN, 0), Math.pow(1, Infinity), Math.pow(-8, 1 / 3));
console.log(Math.exp(0), Math.exp(-Infinity), Math.log(0), Math.log1p(0));
