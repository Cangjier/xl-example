// xl:title parseInt 的 radix 边界与 parseFloat 的怪串
// xl:round 291
// xl:judge stdout
// xl:end

console.log(parseInt(""), parseInt("-0x10"), parseInt("10", 2), parseInt("10", 37));
console.log(parseFloat("Infinity"), parseFloat("-1.5e-3"), parseFloat(".e3"));
