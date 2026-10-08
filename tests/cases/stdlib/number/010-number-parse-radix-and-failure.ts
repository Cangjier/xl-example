// xl:title parseInt / parseFloat 的进制与失败值
// xl:judge stdout
// xl:end

console.log(parseInt("42"), parseInt("0x1f"), parseInt("1f", 16), parseInt("ff", 16));
console.log(parseInt("12px"), parseInt("px"), parseInt(""), parseFloat("3.5x"));
console.log(Number.parseInt("101", 2), Number.parseFloat(".5"), Number("  7  "), Number("x"));
