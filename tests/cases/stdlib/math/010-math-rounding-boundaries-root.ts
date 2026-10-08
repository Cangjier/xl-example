// xl:title Math.round / floor / ceil / trunc 在 .5 与负数上的口径
// xl:judge stdout
// xl:end

console.log(Math.round(0.5), Math.round(-0.5), Math.round(2.5), Math.round(-2.5));
console.log(Math.floor(-1.5), Math.ceil(-1.5), Math.trunc(-1.5));
console.log(Math.floor(1.5), Math.ceil(1.5), Math.trunc(1.9), Math.trunc(-1.9));
console.log(Math.round(NaN), Math.round(Infinity));
