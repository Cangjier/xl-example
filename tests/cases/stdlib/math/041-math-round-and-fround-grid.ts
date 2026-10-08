// xl:title Math.round / floor / ceil：半值向 +Infinity、负数与 .5 的取舍
// xl:judge stdout
// xl:end

console.log(Math.round(-0.5), 1 / Math.round(-0.5), Math.round(0.5), Math.round(-1.5), Math.round(2.5));
console.log(Math.floor(-0.5), Math.ceil(-0.5), Math.floor(-1.5), Math.ceil(1.2));
console.log(Math.round(1e21), Math.floor(0.5) + Math.ceil(0.5));
