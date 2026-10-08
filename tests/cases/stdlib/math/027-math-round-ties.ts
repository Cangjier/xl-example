// xl:title `Math.round` / `Math.trunc` 在 .5 与负数上的口径
// xl:round 330
// xl:judge stdout
// xl:end

console.log(Math.round(0.5), Math.round(1.5), Math.round(-0.5), Math.round(-1.5));
console.log(Math.trunc(-1.7), Math.floor(-1.2), Math.ceil(-1.2));
console.log(Math.sign(-0), 1 / Math.sign(-0));
