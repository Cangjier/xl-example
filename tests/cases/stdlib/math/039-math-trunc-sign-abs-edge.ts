// xl:title Math.trunc / sign / abs：-0 与小数、NaN、Infinity
// xl:judge stdout
// xl:end

console.log(Math.trunc(1.9), Math.trunc(-1.9), Math.trunc(-0.5), 1 / Math.trunc(-0.5));
console.log(Math.sign(-0), 1 / Math.sign(-0), Math.sign(0), Math.sign(NaN), Math.sign(Infinity));
console.log(Math.abs(-0), 1 / Math.abs(-0), Math.abs(NaN), Math.abs(-Infinity));
