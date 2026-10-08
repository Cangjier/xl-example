// xl:title `Math` 的取整族与 `-0`
// xl:round 691
// xl:judge stdout
// xl:end
console.log(Math.round(-0.5), Math.round(0.5), Math.round(-1.5), Math.round(2.5));
console.log(Object.is(Math.round(-0.4), -0));
console.log(Math.trunc(-1.7), Math.sign(-0), Object.is(Math.sign(-0), -0));
