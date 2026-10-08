// xl:title Math.round / floor / ceil / trunc 对 ±0.5 与负零
// xl:round 371
// xl:judge stdout
// xl:end
console.log(Math.round(0.5), Math.round(-0.5), Math.round(2.5), Math.round(-2.5));
console.log(Math.floor(-0.5), Math.ceil(-0.5), Math.trunc(-0.5), Math.trunc(0.5));
console.log(1 / Math.round(-0.5), 1 / Math.floor(-0), 1 / Math.ceil(-0.5));
console.log(Math.round(4.5), Math.round(5.5), Math.round(1e21));
