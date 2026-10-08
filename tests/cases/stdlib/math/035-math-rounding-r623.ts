// xl:title Math.round / floor / ceil 的负数与 -0
// xl:round 623
// xl:judge stdout
// xl:end

console.log(Math.round(-0.5), Object.is(Math.round(-0.5), -0), Math.round(0.5));
console.log(Math.floor(-0.5), Math.ceil(-0.5), Math.floor(-1.5), Math.ceil(-1.5));
