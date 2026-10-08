// xl:title parseInt 的 radix 0 / undefined / 16 前缀
// xl:round 647
// xl:judge stdout
// xl:end

console.log(parseInt("0x1f", 0), parseInt("0x1f", 16), parseInt("0x1f"), parseInt("10", 0));
console.log(parseInt(""), parseInt("  42  "), parseInt("42abc"), parseInt("-0"));
console.log(Number.parseInt === parseInt, Number.parseFloat === parseFloat);
