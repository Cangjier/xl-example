// xl:title parseInt / parseFloat 与 Number.parseInt 一族
// xl:round 291
// xl:judge stdout
// xl:end

console.log(parseInt("12px"), parseInt("0x1f"), parseInt("1f", 16), parseInt("  08"), parseInt("z"));
console.log(parseFloat("3.14abc"), parseFloat(".5"), parseFloat("1e2"), parseFloat("x"));
console.log(Number.parseInt("42"), Number.parseFloat("4.5"));
