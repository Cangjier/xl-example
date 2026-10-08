// xl:title Math 取整那一族的边界：负数、半值、-0
// xl:round 323
// xl:judge stdout
// xl:end

console.log(Math.round(0.5), Math.round(-0.5), Math.round(2.5), Math.round(-2.5));
console.log(Math.floor(-0.5), Math.ceil(-0.5), Math.trunc(-0.9), Math.sign(-3), 1 / Math.sign(-0));
console.log(Math.min(), Math.max(), Math.min(0, -0), 1 / Math.min(0, -0));
