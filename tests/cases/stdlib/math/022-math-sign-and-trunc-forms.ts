// xl:title Math.sign / trunc 在 ±0 与小数上
// xl:round 304
// xl:judge stdout
// xl:end

console.log(Math.sign(-3), Math.sign(0), Object.is(Math.sign(-0), -0), Math.sign(NaN));
console.log(Math.trunc(4.9), Math.trunc(-4.9), Math.trunc(0.5), Math.trunc(-0.5));
